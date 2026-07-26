"""Reusable analysis for the Higgs final project.

The scientific pipeline is fixed; the classifier is a pluggable component that
produces a per-event score h(x).  Everything downstream -- the binned Poisson
GLRT mass fit, the toy-calibrated p-value, the luminosity projection, and the
leaderboard metric -- is identical no matter which classifier produced h(x).

Run `python higgs_analysis.py` from Projects/Project-2 to reproduce the
headline numbers used to anchor the notebook and the autograder.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import norm, chi2, kstest
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.metrics import roc_auc_score

import util

SEED = 6372

# The 24 raw four-momentum components -- mass-blind by design.  The four-lepton
# invariant mass is exactly a quadratic form in these, so a linear model cannot
# see the Higgs peak while a quadratic/MLP model can rediscover it.
RAW = [f"{q}{i}" for i in (1, 2, 3, 4) for q in ("E", "px", "py", "pz", "eta", "phi")]

MASS_LO, MASS_HI, N_BINS = 100.0, 200.0, 20
WINDOW = (120.0, 130.0)          # signal-region definition for the projection
HOLDOUT_FRAC = 0.3


# ---------------------------------------------------------------------------
# Data preparation
# ---------------------------------------------------------------------------

def prepare(seed=0):
    """Load MC + data, split, and attach physical weights and mass columns."""
    processes = util.load_processes()
    weights = util.compute_weights()
    for i, p in enumerate(processes):
        processes[i] = p.assign(_w=weights[i], _proc=i)
    train, holdout = util.split(processes, test_size=HOLDOUT_FRAC, random_state=seed)
    data = util.load_expr_data()
    return {
        "processes": processes,
        "train": pd.concat(train, ignore_index=True),
        "holdout": pd.concat(holdout, ignore_index=True),
        "data": data,
    }


# ---------------------------------------------------------------------------
# Classifier ladder -- each returns a scorer h(x) over a DataFrame
# ---------------------------------------------------------------------------

def _fit(pipe, train):
    y = (train["_proc"] == 0).astype(int).values
    w = util.class_balanced_weights(y == 1, train["_w"].values)
    step = pipe.steps[-1][0]
    pipe.fit(train[RAW].values, y, **{f"{step}__sample_weight": w})
    return pipe


def make_classifier(kind, train):
    if kind == "linear":
        pipe = Pipeline([("s", StandardScaler()),
                         ("c", LogisticRegression(C=1.0, max_iter=5000))])
        return _fit(pipe, train), (lambda d: d[RAW].values)
    if kind == "quadratic":
        pipe = Pipeline([("p", PolynomialFeatures(2, include_bias=False)),
                         ("s", StandardScaler()),
                         ("c", LogisticRegression(C=1.0, max_iter=3000))])
        return _fit(pipe, train), (lambda d: d[RAW].values)
    if kind == "mlp":
        # sklearn's MLPClassifier takes no sample_weight, so we class-balance by
        # resampling: draw equal numbers of signal and background rows, with the
        # background drawn in proportion to its physical weights (the correct P0
        # mixture).  This matches the nu_0 = nu_1 balancing the other models get.
        pipe = Pipeline([("s", StandardScaler()),
                         ("c", MLPClassifier((10, 10, 10), activation="relu",
                                             max_iter=400, random_state=SEED))])
        Xb, yb = _balanced_resample(train, n_per_class=25000)
        pipe.fit(Xb, yb)
        return pipe, (lambda d: d[RAW].values)
    raise ValueError(kind)


def _balanced_resample(train, n_per_class, seed=SEED):
    """Equal-size signal/background resample; background drawn ~ physical weight."""
    rng = np.random.default_rng(seed)
    is_sig = (train["_proc"] == 0).values
    sig = train[is_sig]
    bkg = train[~is_sig]
    si = rng.integers(0, len(sig), n_per_class)                 # signal: uniform
    pb = bkg["_w"].values / bkg["_w"].values.sum()              # background: by weight
    bi = rng.choice(len(bkg), n_per_class, replace=True, p=pb)
    X = np.vstack([sig[RAW].values[si], bkg[RAW].values[bi]])
    y = np.concatenate([np.ones(n_per_class, int), np.zeros(n_per_class, int)])
    return X, y


def score(model, featfn, frame):
    X = featfn(frame)
    try:
        return model.decision_function(X)
    except AttributeError:
        p = model.predict_proba(X)[:, 1]
        return np.log(np.clip(p, 1e-9, 1 - 1e-9) / np.clip(1 - p, 1e-9, 1 - 1e-9))


def auc(model, featfn, holdout):
    y = (holdout["_proc"] == 0).astype(int).values
    w = holdout["_w"].values
    return roc_auc_score(y, score(model, featfn, holdout), sample_weight=w)


# ---------------------------------------------------------------------------
# Binned Poisson GLRT mass fit:  lambda_i = mu * S_i + kappa * B_i
# ---------------------------------------------------------------------------

def _templates(state, keep_mc=None, keep_data=None):
    """Expected signal/background yields per mass bin, and observed data counts.

    keep_mc(frame)/keep_data(frame) are optional boolean masks (a classifier
    cut).  Templates use the full MC (weights already reproduce yields).
    """
    bins = np.linspace(MASS_LO, MASS_HI, N_BINS + 1)
    S = np.zeros(N_BINS)
    B = np.zeros(N_BINS)
    for i, p in enumerate(state["processes"]):
        m = p["mass"].values
        w = p["_w"].values
        if keep_mc is not None:
            k = keep_mc(p)
            m, w = m[k], w[k]
        h, _ = np.histogram(m, bins=bins, weights=w)
        if i == 0:
            S += h
        else:
            B += h
    dm = state["data"]["mass"].values
    if keep_data is not None:
        dm = dm[keep_data(state["data"])]
    obs, _ = np.histogram(dm, bins=bins)
    return S, B, obs


def glrt(S, B, obs):
    """Fit (mu, kappa), profile kappa, return mu_hat, kappa_hat, q, sqrt(q).

    S, B, obs may be 1D (mass only) or 2D (mass x score); arrays are flattened,
    so the same profile-likelihood test serves the 1D fit and the 2D leaderboard.
    """
    S = np.asarray(S, float).ravel()
    obs = np.asarray(obs, float).ravel()
    Bs = np.maximum(np.asarray(B, float).ravel(), 1e-9)

    def nll(p, mu_fixed=None):
        mu = p[0] if mu_fixed is None else mu_fixed
        off = 0 if mu_fixed is None else -1
        lam = np.maximum(mu * S + p[1 + off] * Bs, 1e-9)
        return np.sum(lam - obs * np.log(lam))

    free = minimize(nll, [1.0, 1.2], bounds=[(0, 20), (0.2, 5)])
    null = minimize(lambda p: nll(p, 0.0), [1.2], bounds=[(0.2, 5)])
    q = max(2.0 * (null.fun - free.fun), 0.0)
    return dict(mu_hat=free.x[0], kappa_hat=free.x[1],
                kappa_null=null.x[0], q=q, Z_asymptotic=np.sqrt(q))


def toy_pvalue(S, B, obs, n_toys=2000, seed=SEED):
    """Background-only toys: p = P(q >= q_obs | mu=0). Returns p and Z."""
    res = glrt(S, B, obs)
    q_obs = res["q"]
    Bs = np.maximum(B, 1e-9)
    kappa0 = res["kappa_null"]
    rng = np.random.default_rng(seed)
    mean = kappa0 * Bs
    ge = 0
    for _ in range(n_toys):
        toy = rng.poisson(mean)
        ge += glrt(S, Bs, toy)["q"] >= q_obs
    p = (ge + 1) / (n_toys + 1)          # +1: conservative
    return dict(p_value=p, Z_toy=norm.isf(p), q_obs=q_obs)


# ---------------------------------------------------------------------------
# How solid is it?  Goodness-of-fit, a background-shape systematic, and a CI.
#
# The baseline GLRT lets only the background *normalization* kappa float.  It
# cannot absorb a background *shape* error, so the p-value is conditional on the
# MC mass shape being right.  These tools quantify how much that matters.
# ---------------------------------------------------------------------------

def _bin_centers_standardized():
    edges = np.linspace(MASS_LO, MASS_HI, N_BINS + 1)
    ctr = 0.5 * (edges[:-1] + edges[1:])
    return (ctr - ctr.mean()) / (ctr.max() - ctr.mean())


def goodness_of_fit(expected, obs, n_params):
    """Poisson deviance GOF and its chi-square p-value (dof = nbins - n_params)."""
    e = np.maximum(np.asarray(expected, float).ravel(), 1e-9)
    o = np.asarray(obs, float).ravel()
    pos = o > 0
    term = np.zeros_like(o)
    term[pos] = o[pos] * np.log(o[pos] / e[pos])
    dev = 2.0 * np.sum(term - (o - e))
    dof = len(o) - n_params
    return dict(deviance=float(dev), dof=dof, p_value=float(chi2.sf(dev, dof)))


def glrt_shape(S, B, obs):
    """GLRT for mu=0 with a background *shape* nuisance: lambda = mu*S + kappa*B*exp(t*x).

    Adding one linear tilt of the background makes the null far more flexible, so
    the significance drops sharply -- an honest bound on how much the excess
    depends on trusting the simulated background shape.
    """
    S = np.asarray(S, float).ravel()
    obs = np.asarray(obs, float).ravel()
    Bs = np.maximum(np.asarray(B, float).ravel(), 1e-9)
    x = _bin_centers_standardized()

    def nll(p, mu_fixed=None):
        mu = p[0] if mu_fixed is None else mu_fixed
        off = 0 if mu_fixed is None else -1
        kappa, tilt = p[1 + off], p[2 + off]
        lam = np.maximum(mu * S + kappa * Bs * np.exp(tilt * x), 1e-9)
        return np.sum(lam - obs * np.log(lam))

    free = minimize(nll, [1.0, 1.3, 0.0], bounds=[(0, 20), (0.2, 5), (-3, 3)])
    null = minimize(lambda p: nll(p, 0.0), [1.3, 0.0], bounds=[(0.2, 5), (-3, 3)])
    q = max(2.0 * (null.fun - free.fun), 0.0)
    return dict(mu_hat=free.x[0], kappa_hat=free.x[1], tilt=free.x[2],
                q=q, Z_asymptotic=np.sqrt(q))


def sideband_ks(state, sidebands=((100.0, 115.0), (135.0, 200.0))):
    """KS test: real-data sideband masses vs the weighted background template shape.

    A small p-value means the simulated background does not even describe the data
    away from the peak -- direct evidence of a shape mismatch."""
    m = state["data"]["mass"].values
    keep_data = np.zeros(len(m), bool)
    for lo, hi in sidebands:
        keep_data |= (m >= lo) & (m <= hi)
    allm, allw = [], []
    for i, p in enumerate(state["processes"]):
        if i == 0:
            continue
        mk = np.zeros(len(p), bool)
        for lo, hi in sidebands:
            mk |= (p["mass"].values >= lo) & (p["mass"].values <= hi)
        allm.append(p["mass"].values[mk])
        allw.append(p["_w"].values[mk])
    allm = np.concatenate(allm)
    allw = np.concatenate(allw)
    order = np.argsort(allm)
    xs, cw = allm[order], np.cumsum(allw[order]) / allw.sum()
    cdf = lambda z: np.interp(z, xs, cw, left=0.0, right=1.0)
    ks = kstest(m[keep_data], cdf)
    return dict(statistic=float(ks.statistic), p_value=float(ks.pvalue),
                n_sideband=int(keep_data.sum()))


def mu_confidence_interval(S, B, obs, level=0.95):
    """Profile-likelihood interval for the signal strength mu (kappa profiled out)."""
    S = np.asarray(S, float).ravel()
    obs = np.asarray(obs, float).ravel()
    Bs = np.maximum(np.asarray(B, float).ravel(), 1e-9)

    def prof(mu):
        r = minimize(lambda k: np.sum(np.maximum(mu * S + k[0] * Bs, 1e-9)
                                      - obs * np.log(np.maximum(mu * S + k[0] * Bs, 1e-9))),
                     [1.3], bounds=[(0.2, 5)])
        return r.fun

    g = glrt(S, Bs, obs)
    mu_hat, fmin = g["mu_hat"], prof(g["mu_hat"])
    thr = chi2.ppf(level, 1)
    grid = np.linspace(0.0, 5.0, 1000)
    inside = grid[np.array([2.0 * (prof(u) - fmin) for u in grid]) <= thr]
    return dict(mu_hat=mu_hat, lo=float(inside.min()), hi=float(inside.max()), level=level)


# ---------------------------------------------------------------------------
# Luminosity projection -- a power calculation using the SAME GLRT statistic.
#
# For an N-fold luminosity increase, signal and background both scale by N, and
# the Asimov GLRT statistic scales linearly, so the median expected significance
# is sqrt(N) * baseline.  The *power* -- the probability of actually reaching a
# 5-sigma discovery given mu=1 -- is Phi(Z_median - 5) in the asymptotic limit;
# median >= 5 only means ~50% power, not a guaranteed discovery.
# ---------------------------------------------------------------------------

def glrt_projection(state, factors=(1, 2, 4, 5, 6, 10), threshold=5.0):
    """Return per-factor (N, median expected Z from the GLRT, asymptotic power)."""
    S, B, _ = _templates(state)
    out = []
    for N in factors:
        q = glrt(N * S, N * B, N * (S + B))["q"]      # Asimov: expected counts at Nx
        z_med = np.sqrt(q)
        power = float(norm.cdf(z_med - threshold))
        out.append((N, float(z_med), power))
    return out


# ---------------------------------------------------------------------------
# Leaderboard metric: 2D (mass x score) GLRT expected Asimov Z.
#
# The classifier score enters as a *fit dimension*, not a hard cut, so it never
# throws away the sidebands that pin kappa, and adding information can only help
# (every classifier scores at least the mass-only baseline).  Asimov data = the
# MC expectation itself (mu=1, kappa=1); the 495 experimental events are never
# touched, so this cannot be model selection on the discovery data.
#
# LOCKBOX: templates are built from the HELD-OUT MC only (rescaled by
# 1/HOLDOUT_FRAC to recover full yields), never the rows the classifier trained
# on.  Otherwise a high-capacity or memorizing submission could inflate its own
# ranking by scoring its training rows over-confidently.
# ---------------------------------------------------------------------------

N_SCORE_BINS = 4


def _holdout_by_proc(state):
    h = state["holdout"]
    return [h[h["_proc"] == i] for i in range(len(state["processes"]))]


def expected_Z_2d(model, featfn, state, n_score_bins=N_SCORE_BINS):
    """Rank metric: sqrt(q) of the 2D mass x score GLRT on held-out Asimov data."""
    frames = _holdout_by_proc(state)
    mass_bins = np.linspace(MASS_LO, MASS_HI, N_BINS + 1)
    # score-bin edges from held-out signal score quantiles (no training rows)
    edges = np.quantile(score(model, featfn, frames[0]), np.linspace(0, 1, n_score_bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    S = np.zeros((N_BINS, n_score_bins))
    B = np.zeros_like(S)
    for i, p in enumerate(frames):
        h, _, _ = np.histogram2d(p["mass"].values, score(model, featfn, p),
                                 bins=[mass_bins, edges],
                                 weights=p["_w"].values / HOLDOUT_FRAC)
        if i == 0:
            S += h
        else:
            B += h
    return np.sqrt(glrt(S, B, S + B)["q"])          # Asimov: MC is truth


def mass_only_expected_Z(state):
    """Baseline (no classifier): held-out 1D mass-only GLRT expected Z."""
    frames = _holdout_by_proc(state)
    mass_bins = np.linspace(MASS_LO, MASS_HI, N_BINS + 1)
    S = np.zeros(N_BINS)
    B = np.zeros(N_BINS)
    for i, p in enumerate(frames):
        h, _ = np.histogram(p["mass"].values, bins=mass_bins,
                            weights=p["_w"].values / HOLDOUT_FRAC)
        if i == 0:
            S += h
        else:
            B += h
    return np.sqrt(glrt(S, B, S + B)["q"])


def sideband_retention(model, featfn, state, sig_eff=0.8, sb=(115.0, 135.0)):
    """Diagnostic: fraction of background outside the mass peak kept by an
    sig_eff-efficiency cut.  Collapses toward 0 as a classifier learns mass,
    exposing why a hard cut destroys the kappa constraint (mass-sculpting).
    Held-out MC only; the kept/total ratio is unaffected by the yield rescale."""
    frames = _holdout_by_proc(state)
    thr = np.quantile(score(model, featfn, frames[0]), 1 - sig_eff)
    lo, hi = sb
    kept = total = 0.0
    for i, p in enumerate(frames):
        if i == 0:
            continue
        m = p["mass"].values
        w = p["_w"].values
        outside = (m < lo) | (m > hi)
        total += w[outside].sum()
        kept += w[outside & (score(model, featfn, p) > thr)].sum()
    return kept / total


def leaderboard_row(model, featfn, state):
    """The three columns shown on the leaderboard for one classifier entry."""
    return dict(
        auc=auc(model, featfn, state["holdout"]),
        expected_Z=expected_Z_2d(model, featfn, state),
        sideband_retention=sideband_retention(model, featfn, state),
    )


# ---------------------------------------------------------------------------
# Verification driver
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    st = prepare(seed=0)
    print(f"loaded: {[len(p) for p in st['processes']]} MC rows, "
          f"{len(st['data'])} data events\n")

    # --- headline GLRT, no classifier ---
    S, B, obs = _templates(st)
    g = glrt(S, B, obs)
    print("=== GLRT mass fit, NO classifier (100-200 GeV, 20 bins) ===")
    print(f"  mu_hat={g['mu_hat']:.3f}  kappa_hat={g['kappa_hat']:.3f}  "
          f"q={g['q']:.3f}  Z_asymptotic={g['Z_asymptotic']:.3f}")
    tp = toy_pvalue(S, B, obs, n_toys=10000)
    print(f"  toy p-value={tp['p_value']:.4f}  Z_toy={tp['Z_toy']:.3f}")

    # --- how solid? GOF, shape systematic, CI ---
    print("\n=== goodness-of-fit and systematics ===")
    gof0 = goodness_of_fit(g["kappa_null"] * B, obs, n_params=1)
    print(f"  background-only GOF p = {gof0['p_value']:.4f}  (poor fit => background model is strained)")
    gs = glrt_shape(S, B, obs)
    print(f"  with background shape nuisance: mu_hat={gs['mu_hat']:.3f} Z={gs['Z_asymptotic']:.3f}"
          f"  (baseline Z was {g['Z_asymptotic']:.2f})")
    ks = sideband_ks(st)
    print(f"  sideband KS p = {ks['p_value']:.4f}")
    ci = mu_confidence_interval(S, B, obs)
    print(f"  mu 95% CI = [{ci['lo']:.2f}, {ci['hi']:.2f}]")

    # --- leaderboard: rank on 2D expected Z (held-out), diagnostics beside it ---
    print("\n=== leaderboard (rank = 2D mass x score expected Z, held-out MC) ===")
    print(f"  mass-only baseline (no classifier): {mass_only_expected_Z(st):.3f}")
    print(f"{'model':>12} {'AUC':>7} {'expected_Z':>11} {'sideband_ret':>13}")
    for kind in ("linear", "quadratic", "mlp"):
        mdl, fx = make_classifier(kind, st["train"])
        r = leaderboard_row(mdl, fx, st)
        print(f"{kind:>12} {r['auc']:7.4f} {r['expected_Z']:11.3f} "
              f"{r['sideband_retention']:13.3f}")

    # --- luminosity projection: GLRT power calculation ---
    print("\n=== luminosity projection (GLRT power, mu=1) ===")
    print(f"{'lumi':>5} {'median Z':>9} {'power P(Z>=5)':>14}")
    for N, z_med, power in glrt_projection(st):
        print(f"{N:>4}x {z_med:9.2f} {power:14.2f}")

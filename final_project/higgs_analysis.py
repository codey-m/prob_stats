"""Reusable analysis for the Higgs final project.

The scientific pipeline is fixed; the classifier is a pluggable component that
produces a per-event score h(x).  Everything downstream -- the binned Poisson
GLRT mass fit, the toy-calibrated p-value, the luminosity projection, and the
model-comparison metric -- is identical no matter which classifier produced h(x).

Run `python higgs_analysis.py` from ProbStatsLabs/final_project to reproduce the
headline numbers used to anchor the notebook and the autograder.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import norm, chi2, t as t_dist
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
    so the same profile-likelihood test serves the 1D fit and the 2D comparison.
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
# How solid is it?  Goodness-of-fit, a background-shape check, and two intervals.
#
# The baseline GLRT lets only the background *normalization* kappa float.  It
# cannot absorb a background *shape* error, so the p-value is conditional on the
# MC mass shape being right.  These tools quantify how much that matters: the
# deviance GOF asks whether the background-only model fits at all, glrt_shape()
# re-tests with the shape free, and the two mu intervals below are the matched
# pair -- one conditional on the fixed shape, one with the shape profiled out.
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
    the significance drops sharply -- a measure of how much the excess depends on
    trusting the simulated background shape.

    The tilt is a *generic* one-parameter flexibility check.  It is NOT a model of
    any particular omitted process: the reducible Drell-Yan/ttbar backgrounds are
    absent from this dataset (see util.py) and nothing here stands in for them.
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


def _interval_from_profile(prof, mu_hat, level):
    """Grid-scan a profile NLL for the set {mu : 2*(prof(mu) - prof(mu_hat)) <= thr}."""
    fmin = prof(mu_hat)
    thr = chi2.ppf(level, 1)
    grid = np.linspace(0.0, 5.0, 1000)
    inside = grid[np.array([2.0 * (prof(u) - fmin) for u in grid]) <= thr]
    return dict(mu_hat=mu_hat, lo=float(inside.min()), hi=float(inside.max()), level=level)


def mu_confidence_interval(S, B, obs, level=0.95):
    """Profile-likelihood interval for mu with only kappa profiled out.

    CONDITIONAL, FIXED-SHAPE interval: the background mass shape is held at the MC
    prediction and only its normalization floats.  It is therefore valid only to
    the extent that the simulated shape is right, which Section 5 shows is exactly
    the assumption under strain.  Pair it with mu_confidence_interval_shape().
    """
    S = np.asarray(S, float).ravel()
    obs = np.asarray(obs, float).ravel()
    Bs = np.maximum(np.asarray(B, float).ravel(), 1e-9)

    def prof(mu):
        r = minimize(lambda k: np.sum(np.maximum(mu * S + k[0] * Bs, 1e-9)
                                      - obs * np.log(np.maximum(mu * S + k[0] * Bs, 1e-9))),
                     [1.3], bounds=[(0.2, 5)])
        return r.fun

    return _interval_from_profile(prof, glrt(S, Bs, obs)["mu_hat"], level)


def mu_confidence_interval_shape(S, B, obs, level=0.95):
    """Profile-likelihood interval for mu with BOTH kappa and the shape tilt profiled out.

    The interval that goes with glrt_shape(): the same one-parameter background
    tilt is free at every mu.  Letting the shape absorb part of the excess widens
    the interval downward until it reaches mu=0, which is the interval consistent
    with the shape-flexible significance.
    """
    S = np.asarray(S, float).ravel()
    obs = np.asarray(obs, float).ravel()
    Bs = np.maximum(np.asarray(B, float).ravel(), 1e-9)
    x = _bin_centers_standardized()

    def prof(mu):
        def nll(p):
            lam = np.maximum(mu * S + p[0] * Bs * np.exp(p[1] * x), 1e-9)
            return np.sum(lam - obs * np.log(lam))
        return minimize(nll, [1.3, 0.0], bounds=[(0.2, 5), (-3, 3)]).fun

    return _interval_from_profile(prof, glrt_shape(S, Bs, obs)["mu_hat"], level)


# ---------------------------------------------------------------------------
# Luminosity projection -- a CONDITIONAL, ASYMPTOTIC, FIXED-TEMPLATE power calc.
#
# For an N-fold luminosity increase, signal and background both scale by N, and
# the GLRT statistic on expected counts scales linearly, so the median expected significance
# is sqrt(N) * baseline.  The *power* -- the probability of actually reaching a
# 5-sigma discovery given mu=1 -- is Phi(Z_median - 5) in the asymptotic limit;
# median >= 5 only means ~50% power, not a guaranteed discovery.
#
# Three approximations are baked in, and all three are optimistic:
#   1. it uses the baseline glrt(), NOT glrt_shape(), so it inherits the
#      fixed-background-shape assumption (with the Section 5 tilt free, 5x gives
#      median Z ~ 4.7 and power ~ 0.39 instead of 5.16 and 0.57);
#   2. expected counts stand in for the median toy dataset, an asymptotic step;
#   3. the power uses a normal approximation for the distribution of Z.
# Read the output as "how the reach scales if the background model is right",
# not as a forecast.
# ---------------------------------------------------------------------------

def glrt_projection(state, factors=(1, 2, 4, 5, 6, 10), threshold=5.0):
    """Per-factor (N, median expected Z, asymptotic power) under the fixed template."""
    S, B, _ = _templates(state)
    out = []
    for N in factors:
        q = glrt(N * S, N * B, N * (S + B))["q"]      # expected counts at Nx
        z_med = np.sqrt(q)
        power = float(norm.cdf(z_med - threshold))
        out.append((N, float(z_med), power))
    return out


# ---------------------------------------------------------------------------
# Model-comparison metric: 2D (mass x score) GLRT expected Z.
#
# This is what Section 8 ranks classifiers by instead of AUC.  It measures what
# the *full analysis* gains from a score, not how well the score separates signal
# from background on its own -- the distinction the section is built around.
#
# The classifier score enters as a *fit dimension*, not a hard cut, so it never
# throws away the sidebands that pin kappa, and adding information can only help
# (every classifier scores at least the mass-only baseline).  The "data" fitted
# here are the expected counts themselves (mu=1, kappa=1); the 495 experimental
# events are never touched, so this cannot be model selection on discovery data.
#
# Held-out MC only: templates are built from the HELD-OUT rows (rescaled by
# 1/HOLDOUT_FRAC to recover full yields), never the rows the classifier trained
# on.  Otherwise a high-capacity or memorizing model could inflate its own score
# by rating its training rows over-confidently.
# ---------------------------------------------------------------------------

N_SCORE_BINS = 4


def _holdout_by_proc(state):
    h = state["holdout"]
    return [h[h["_proc"] == i] for i in range(len(state["processes"]))]


def expected_Z_2d(model, featfn, state, n_score_bins=N_SCORE_BINS):
    """Comparison metric: sqrt(q) of the 2D mass x score GLRT on held-out expected counts."""
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
    return np.sqrt(glrt(S, B, S + B)["q"])          # expected counts: MC is truth


def mass_only_expected_Z(state, n_bins=N_BINS):
    """No-classifier reference: held-out 1D mass-only GLRT expected Z.

    n_bins defaults to the N_BINS used by the observed fit.  Pass a larger value
    to build a CAPACITY-MATCHED reference (see matched_baseline_expected_Z): more
    Poisson cells raise the expected Z on their own, with no classifier involved.
    """
    frames = _holdout_by_proc(state)
    mass_bins = np.linspace(MASS_LO, MASS_HI, n_bins + 1)
    S = np.zeros(n_bins)
    B = np.zeros(n_bins)
    for i, p in enumerate(frames):
        h, _ = np.histogram(p["mass"].values, bins=mass_bins,
                            weights=p["_w"].values / HOLDOUT_FRAC)
        if i == 0:
            S += h
        else:
            B += h
    return np.sqrt(glrt(S, B, S + B)["q"])


def matched_baseline_expected_Z(state, n_score_bins=N_SCORE_BINS):
    """The FAIR reference for expected_Z_2d: mass-only, same number of cells.

    expected_Z_2d fits N_BINS x n_score_bins Poisson cells; mass_only_expected_Z
    fits N_BINS.  Comparing them credits the classifier for the finer grid it
    was handed.  Spending the same cell budget on the mass axis, with no
    classifier at all, isolates what a score actually contributes.

    The cells are not what raises the expected Z.  Splitting the same events on
    a variable carrying no information moves it by about 0.01; spending those
    cells on mass moves it by about 0.37, because 5 GeV bins smear out a peak
    only a few GeV wide.  What the fine grid buys is mass resolution, which is
    also why a score that is a function of mass reproduces the gain.
    """
    return mass_only_expected_Z(state, n_bins=N_BINS * n_score_bins)


def mass_tag_scorer():
    """Control score carrying nothing but mass: h(x) = -|m - 125|.

    It has zero information beyond the axis the fit already uses, so whatever it
    scores on expected_Z_2d is the part of a classifier's score attributable to
    re-expressing the mass rather than to new information.
    """
    class _Tag:
        def decision_function(self, X):
            return -np.abs(np.asarray(X, float).ravel() - 125.0)
    return _Tag(), (lambda d: d["mass"].values)


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


def comparison_row(model, featfn, state):
    """The three columns Section 8 shows for one classifier: AUC, expected Z, sideband retention."""
    return dict(
        auc=auc(model, featfn, state["holdout"]),
        expected_Z=expected_Z_2d(model, featfn, state),
        sideband_retention=sideband_retention(model, featfn, state),
    )


CONTENDERS = ("mass_tag", "linear", "quadratic", "mlp")


def expected_Z_scan(seeds=range(10), contenders=CONTENDERS):
    """Repeat the Section 8 comparison over train/holdout splits.

    One row per split, holding the capacity-matched mass-only reference and each
    contender's expected Z computed on that SAME split.  Pairing matters: the
    reference and the contenders move together from split to split, so the
    difference has far less spread than either column on its own.

    A single split cannot say whether a gap of a few hundredths in expected Z
    means anything.  This is what tells you.
    """
    rows = []
    for s in seeds:
        state = prepare(seed=int(s))
        row = {"seed": int(s),
               "mass_only_20": mass_only_expected_Z(state, n_bins=N_BINS),
               "matched": matched_baseline_expected_Z(state)}
        for kind in contenders:
            if kind == "mass_tag":
                mdl, fx = mass_tag_scorer()
            else:
                mdl, fx = make_classifier(kind, state["train"])
            row[kind] = expected_Z_2d(mdl, fx, state)
        rows.append(row)
    return rows


def paired_interval(rows, contender, reference="matched", level=0.95):
    """Mean, standard error and t-interval of (contender - reference) across splits.

    Returns `resolved=True` when the interval excludes zero, meaning the gap is
    larger than the split-to-split noise.  A point estimate alone cannot support
    that claim, which is the whole reason this function exists.
    """
    d = np.array([r[contender] - r[reference] for r in rows], float)
    n = len(d)
    if n < 2:
        raise ValueError("a paired interval needs at least two splits")
    mean = float(d.mean())
    se = float(d.std(ddof=1) / np.sqrt(n))
    half = float(t_dist.ppf(0.5 + level / 2.0, n - 1) * se)
    lo, hi = mean - half, mean + half
    return dict(contender=contender, n=n, mean=mean, se=se,
                low=lo, high=hi, resolved=bool(lo > 0 or hi < 0))


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
    ci = mu_confidence_interval(S, B, obs)
    cis = mu_confidence_interval_shape(S, B, obs)
    print(f"  mu 95% CI, background shape FIXED  = [{ci['lo']:.2f}, {ci['hi']:.2f}]")
    print(f"  mu 95% CI, background shape FLEXED = [{cis['lo']:.2f}, {cis['hi']:.2f}]"
          f"   (reaches mu=0: {cis['lo'] <= 1e-9})")

    # --- model comparison: 2D expected Z (held-out), diagnostics beside it ---
    print("\n=== model comparison (2D mass x score expected Z, held-out MC) ===")
    print(f"  mass-only, {N_BINS} cells (no classifier):      {mass_only_expected_Z(st):.3f}")
    print(f"  mass-only, {N_BINS * N_SCORE_BINS} cells (capacity-matched): "
          f"{matched_baseline_expected_Z(st):.3f}   <- the fair reference")
    _tag, _tagfx = mass_tag_scorer()
    print(f"  mass tag -|m-125| (zero new info):     {expected_Z_2d(_tag, _tagfx, st):.3f}")
    print(f"{'model':>12} {'AUC':>7} {'expected_Z':>11} {'sideband_ret':>13}")
    for kind in ("linear", "quadratic", "mlp"):
        mdl, fx = make_classifier(kind, st["train"])
        r = comparison_row(mdl, fx, st)
        print(f"{kind:>12} {r['auc']:7.4f} {r['expected_Z']:11.3f} "
              f"{r['sideband_retention']:13.3f}")

    # --- luminosity projection: GLRT power calculation ---
    print("\n=== luminosity projection (GLRT power, mu=1) ===")
    print(f"{'lumi':>5} {'median Z':>9} {'power P(Z>=5)':>14}")
    for N, z_med, power in glrt_projection(st):
        print(f"{N:>4}x {z_med:9.2f} {power:14.2f}")

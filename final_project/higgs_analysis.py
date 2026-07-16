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
from scipy.optimize import minimize_scalar, minimize
from scipy.stats import norm
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
        pipe = Pipeline([("s", StandardScaler()),
                         ("c", MLPClassifier((10, 10, 10), activation="relu",
                                             max_iter=60, random_state=SEED))])
        y = (train["_proc"] == 0).astype(int).values
        pipe.fit(train[RAW].values, y)          # MLP: unweighted, as in the original
        return pipe, (lambda d: d[RAW].values)
    raise ValueError(kind)


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
# Asimov significance and luminosity projection
# ---------------------------------------------------------------------------

def asimov_Z(S, B):
    S, B = float(S), float(max(B, 1e-9))
    return np.sqrt(2.0 * ((S + B) * np.log(1.0 + S / B) - S))


def window_yields(state, keep_mc=None):
    lo, hi = WINDOW
    S = B = 0.0
    for i, p in enumerate(state["processes"]):
        m = p["mass"].values
        w = p["_w"].values
        if keep_mc is not None:
            k = keep_mc(p)
            m, w = m[k], w[k]
        y = w[(m >= lo) & (m <= hi)].sum()
        if i == 0:
            S += y
        else:
            B += y
    return S, B


def luminosity_projection(state, factors=(1, 2, 4, 6, 10)):
    S, B = window_yields(state)
    return [(f, f * S, f * B, asimov_Z(f * S, f * B)) for f in factors]


# ---------------------------------------------------------------------------
# Leaderboard metric: 2D (mass x score) GLRT expected Asimov Z, MC-only.
#
# The classifier score enters as a *fit dimension*, not a hard cut, so it never
# throws away the sidebands that pin kappa, and adding information can only help
# (every classifier scores at least the mass-only baseline).  Asimov data = the
# MC expectation itself (mu=1, kappa=1); the 495 experimental events are never
# touched, so this cannot be model selection on the discovery data.
# ---------------------------------------------------------------------------

N_SCORE_BINS = 4


def expected_Z_2d(model, featfn, state, n_score_bins=N_SCORE_BINS):
    """Rank metric: sqrt(q) of the 2D mass x score GLRT on Asimov (MC-truth) data."""
    mass_bins = np.linspace(MASS_LO, MASS_HI, N_BINS + 1)
    # score-bin edges from signal-process score quantiles (frozen, MC-only)
    s_sig = score(model, featfn, state["processes"][0])
    edges = np.quantile(s_sig, np.linspace(0, 1, n_score_bins + 1))
    edges[0], edges[-1] = -np.inf, np.inf
    S = np.zeros((N_BINS, n_score_bins))
    B = np.zeros_like(S)
    for i, p in enumerate(state["processes"]):
        h, _, _ = np.histogram2d(p["mass"].values, score(model, featfn, p),
                                 bins=[mass_bins, edges], weights=p["_w"].values)
        if i == 0:
            S += h
        else:
            B += h
    return np.sqrt(glrt(S, B, S + B)["q"])          # Asimov: MC is truth


def mass_only_expected_Z(state):
    """Baseline: sqrt(q) of the 1D mass-only GLRT on Asimov data. No classifier."""
    S, B, _ = _templates(state)
    return np.sqrt(glrt(S, B, S + B)["q"])


def sideband_retention(model, featfn, state, sig_eff=0.8, sb=(115.0, 135.0)):
    """Diagnostic: fraction of background outside the mass peak kept by an
    sig_eff-efficiency cut.  Collapses toward 0 as a classifier learns mass,
    exposing why a hard cut destroys the kappa constraint (mass-sculpting)."""
    thr = np.quantile(score(model, featfn, state["processes"][0]), 1 - sig_eff)
    lo, hi = sb
    kept = total = 0.0
    for i, p in enumerate(state["processes"]):
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
    tp = toy_pvalue(S, B, obs, n_toys=2000)
    print(f"  toy p-value={tp['p_value']:.4f}  Z_toy={tp['Z_toy']:.3f}")

    # --- leaderboard: rank on 2D expected Z, diagnostics beside it ---
    print("\n=== leaderboard (rank = 2D mass x score expected Z, MC-only) ===")
    print(f"  mass-only baseline (no classifier): {mass_only_expected_Z(st):.3f}")
    print(f"{'model':>12} {'AUC':>7} {'expected_Z':>11} {'sideband_ret':>13}")
    rows = []
    for kind in ("linear", "quadratic", "mlp"):
        mdl, fx = make_classifier(kind, st["train"])
        r = leaderboard_row(mdl, fx, st)
        rows.append((kind, r))
        print(f"{kind:>12} {r['auc']:7.4f} {r['expected_Z']:11.3f} "
              f"{r['sideband_retention']:13.3f}")

    # --- luminosity projection ---
    print("\n=== luminosity projection (Asimov, mu=1, window 120-130) ===")
    for f, s, b, z in luminosity_projection(st, factors=(1, 2, 4, 6, 10)):
        flag = "  <== 5 sigma" if z >= 5 else ""
        print(f"  {f:2d}x: S={s:6.1f} B={b:6.1f}  Z={z:5.2f}{flag}")

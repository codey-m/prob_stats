"""Regression anchors for the Higgs final project.

Run as a script:   python test_higgs.py
Or under pytest:    pytest test_higgs.py

These are the numbers the notebook narrative and the autograder tolerances are
built on; if the shipped data, util.py, or higgs_analysis.py change, this is
where it surfaces.
"""

import os
import numpy as np
import util
import higgs_analysis as H

# Built once and shared across checks.
_ST = H.prepare(seed=0)
_S, _B, _OBS = H._templates(_ST)
_G = H.glrt(_S, _B, _OBS)
_MODELS = {k: H.make_classifier(k, _ST["train"]) for k in ("linear", "quadratic", "mlp")}


def _close(a, b, tol, msg):
    assert abs(a - b) <= tol, f"{msg}: {a:.4f} vs {b:.4f} (tol {tol})"


# --- physical yields and the weight-bug fix ---------------------------------

def test_physical_yields():
    w = util.compute_weights()
    yields = [w[i] * len(_ST["processes"][i]) for i in range(4)]
    _close(sum(yields[1:]), 411.30, 1.0, "total background yield")
    _close(yields[0], 9.38, 0.1, "signal yield")


def test_class_balanced_weights_equal_totals():
    full = _ST["train"]
    sig = (full["_proc"] == 0).values
    bw = util.class_balanced_weights(sig, full["_w"].values)
    _close(bw[sig].sum(), bw[~sig].sum(), 1e-6, "signal vs background total weight")
    _close(bw.mean(), 1.0, 1e-6, "mean training weight (normalized)")


# --- the observed GLRT result (mass-only; classifier not involved) ----------

def test_glrt_baseline():
    _close(_G["mu_hat"], 1.10, 0.15, "mu_hat (~ SM value 1)")
    _close(_G["Z_asymptotic"], 2.29, 0.15, "baseline Z")
    _close(int(_OBS.sum()), 137, 0, "events in 100-200 GeV window")


def test_toy_pvalue():
    tp = H.toy_pvalue(_S, _B, _OBS, n_toys=10000)
    _close(tp["p_value"], 0.011, 0.006, "toy p-value")


# --- how solid? goodness-of-fit and systematics -----------------------------

def test_goodness_of_fit_is_poor():
    gof = H.goodness_of_fit(_G["kappa_null"] * _B, _OBS, n_params=1)
    _close(gof["p_value"], 0.013, 0.008, "background-only GOF p")


def test_shape_systematic_lowers_significance():
    gs = H.glrt_shape(_S, _B, _OBS)
    _close(gs["Z_asymptotic"], 1.42, 0.20, "Z with background-shape nuisance")
    _close(gs["mu_hat"], 0.76, 0.20, "mu_hat with shape nuisance")
    assert gs["Z_asymptotic"] < _G["Z_asymptotic"], "shape nuisance must reduce Z"


def test_sideband_ks_mismatch():
    ks = H.sideband_ks(_ST)
    _close(ks["p_value"], 0.027, 0.015, "sideband KS p")


def test_mu_confidence_interval_is_wide():
    ci = H.mu_confidence_interval(_S, _B, _OBS)
    _close(ci["lo"], 0.14, 0.10, "mu CI low")
    _close(ci["hi"], 2.35, 0.20, "mu CI high")


# --- classifier ladder and leaderboard --------------------------------------

def test_classifier_ladder_auc():
    targets = {"linear": 0.632, "quadratic": 0.906, "mlp": 0.961}
    for kind, tgt in targets.items():
        mdl, fx = _MODELS[kind]
        _close(H.auc(mdl, fx, _ST["holdout"]), tgt, 0.03, f"AUC {kind}")


def test_leaderboard_ordering():
    base = H.mass_only_expected_Z(_ST)
    _close(base, 2.35, 0.10, "mass-only baseline")
    ez = {k: H.expected_Z_2d(m, f, _ST) for k, (m, f) in _MODELS.items()}
    _close(ez["quadratic"], 2.71, 0.12, "quadratic expected Z")
    _close(ez["mlp"], 2.42, 0.15, "MLP expected Z")
    # the load-bearing lesson: quadratic leads; the highest-AUC model (MLP) does
    # NOT, and every classifier is at least the baseline.
    assert ez["quadratic"] > base
    assert ez["quadratic"] > ez["mlp"]
    assert ez["quadratic"] > ez["linear"]


def test_sideband_retention_collapses_with_auc():
    sbr = {k: H.sideband_retention(m, f, _ST) for k, (m, f) in _MODELS.items()}
    _close(sbr["linear"], 0.50, 0.06, "sideband ret linear")
    _close(sbr["quadratic"], 0.12, 0.05, "sideband ret quadratic")
    _close(sbr["mlp"], 0.03, 0.03, "sideband ret MLP")
    assert sbr["linear"] > sbr["quadratic"] > sbr["mlp"]


def test_leaderboard_uses_holdout_only():
    """Lockbox: the ranking metric must not touch the classifier's training rows,
    so a memorizing submission cannot inflate its own score."""
    mdl, fx = _MODELS["quadratic"]
    z_full = H.expected_Z_2d(mdl, fx, _ST)
    corrupted = dict(_ST)
    corrupted["train"] = _ST["train"].iloc[:0]     # empty the training rows
    z_no_train = H.expected_Z_2d(mdl, fx, corrupted)
    _close(z_full, z_no_train, 1e-9, "expected_Z_2d must ignore training rows")


# --- power projection -------------------------------------------------------

def test_glrt_power_projection():
    proj = dict((N, (z, p)) for N, z, p in H.glrt_projection(_ST, factors=(1, 5, 10)))
    _close(proj[5][0], 5.16, 0.15, "median Z at 5x")
    _close(proj[5][1], 0.57, 0.08, "power at 5x")
    assert proj[10][1] >= 0.95, "power at 10x should be near-certain"


# --- reproducibility --------------------------------------------------------

def test_cwd_independent():
    cwd = os.getcwd()
    try:
        os.chdir(os.path.dirname(os.path.abspath(__file__)) or ".")
        os.chdir("..")
        st = H.prepare(seed=0)
        assert len(st["data"]) == 495
    finally:
        os.chdir(cwd)


def main():
    import traceback
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"  ok  {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {fn.__name__}: {e}")
    print("\n" + ("ALL ANCHORS OK" if not failed else f"{failed} FAILED"))
    return failed


if __name__ == "__main__":
    raise SystemExit(main())

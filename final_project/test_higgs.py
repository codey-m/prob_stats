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


def test_mu_confidence_interval_fixed_shape():
    """The conditional interval: background shape held at the MC prediction."""
    ci = H.mu_confidence_interval(_S, _B, _OBS)
    _close(ci["lo"], 0.14, 0.10, "mu CI low (fixed shape)")
    _close(ci["hi"], 2.35, 0.20, "mu CI high (fixed shape)")
    assert ci["lo"] > 0.0, "the fixed-shape interval excludes mu=0"


def test_mu_confidence_interval_shape_includes_zero():
    """Load-bearing for Sections 5/6/9: once the background shape is free, the
    interval reaches mu=0, so the exclusion of mu=0 is an artifact of holding the
    simulated mass shape fixed rather than a property of the data."""
    cis = H.mu_confidence_interval_shape(_S, _B, _OBS)
    _close(cis["lo"], 0.00, 0.05, "mu CI low (shape flexed)")
    _close(cis["hi"], 2.04, 0.20, "mu CI high (shape flexed)")
    assert cis["lo"] <= 1e-9, "the shape-flexed interval must reach mu=0"
    ci = H.mu_confidence_interval(_S, _B, _OBS)
    assert cis["lo"] < ci["lo"], "flexing the shape must widen the interval downward"


# --- classifier ladder and model comparison --------------------------------------

def test_classifier_ladder_auc():
    targets = {"linear": 0.632, "quadratic": 0.906, "mlp": 0.961}
    for kind, tgt in targets.items():
        mdl, fx = _MODELS[kind]
        _close(H.auc(mdl, fx, _ST["holdout"]), tgt, 0.03, f"AUC {kind}")


def test_model_comparison_ordering():
    base = H.mass_only_expected_Z(_ST)
    _close(base, 2.35, 0.10, "mass-only baseline, 20 cells")
    ez = {k: H.expected_Z_2d(m, f, _ST) for k, (m, f) in _MODELS.items()}
    _close(ez["linear"], 2.36, 0.12, "linear expected Z")
    _close(ez["mlp"], 2.42, 0.15, "MLP expected Z")
    _close(ez["quadratic"], 2.71, 0.12, "quadratic expected Z")
    # The highest-AUC model (MLP) does NOT lead, and the AUC ordering
    # (linear < quadratic < mlp) is NOT the expected-Z ordering.  The notebook
    # quotes this full ordering, so anchor it rather than just the winner.
    assert ez["linear"] < ez["mlp"] < ez["quadratic"], (
        f"expected linear < mlp < quadratic, got {ez}")
    for k, v in ez.items():
        assert v >= base - 1e-9, f"{k} fell below the 20-cell baseline"


def test_capacity_matched_baseline_is_not_beaten():
    """Section 8's central claim.  The 2D metric fits N_BINS x N_SCORE_BINS cells
    while the stated baseline fits N_BINS, so the extra cells alone raise the
    expected Z.  Against a mass-only fit with the SAME cell count, no classifier
    wins: the apparent gain was resolution, not information."""
    matched = H.matched_baseline_expected_Z(_ST)
    _close(matched, 2.72, 0.10, "capacity-matched baseline (80 cells)")
    assert matched > H.mass_only_expected_Z(_ST), "more cells must raise expected Z"
    ez = {k: H.expected_Z_2d(m, f, _ST) for k, (m, f) in _MODELS.items()}
    for k, v in ez.items():
        assert v <= matched + 0.02, (
            f"{k} beat the capacity-matched baseline ({v:.3f} > {matched:.3f}); "
            "Section 8's conclusion would need revisiting")


def test_mass_tag_control_reproduces_most_of_the_gain():
    """The control that identifies the gain as resolution: a score carrying only
    mass, with no information the fit lacks, must still score near the best
    classifier."""
    tag, fx = H.mass_tag_scorer()
    z = H.expected_Z_2d(tag, fx, _ST)
    _close(z, 2.70, 0.12, "pure mass tag expected Z")
    _close(H.sideband_retention(tag, fx, _ST), 0.00, 0.02, "mass tag sideband retention")
    quad_z = H.expected_Z_2d(*_MODELS["quadratic"], _ST)
    assert abs(z - quad_z) < 0.15, (
        f"mass tag {z:.3f} should land near the quadratic {quad_z:.3f}; "
        "the notebook argues the quadratic's score is mostly re-expressed mass")


def test_sideband_retention_collapses_with_auc():
    sbr = {k: H.sideband_retention(m, f, _ST) for k, (m, f) in _MODELS.items()}
    _close(sbr["linear"], 0.50, 0.06, "sideband ret linear")
    _close(sbr["quadratic"], 0.12, 0.05, "sideband ret quadratic")
    _close(sbr["mlp"], 0.03, 0.03, "sideband ret MLP")
    assert sbr["linear"] > sbr["quadratic"] > sbr["mlp"]


def test_comparison_uses_holdout_only():
    """The comparison metric must not touch the classifier's training rows, so a
    memorizing model cannot inflate its own score."""
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

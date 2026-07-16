"""Regression anchors for the Higgs final project.

Run from Projects/Project-2:  python test_higgs.py
These are the numbers the notebook narrative and the autograder tolerances are
built on; if the shipped data or util.py change, this is where it surfaces.
"""

import numpy as np
import util
import higgs_analysis as H


def approx(a, b, tol, msg):
    assert abs(a - b) <= tol, f"{msg}: {a:.4f} vs {b:.4f} (tol {tol})"
    print(f"  ok  {msg}: {a:.4f}")


def main():
    st = H.prepare(seed=0)
    procs = st["processes"]
    w = util.compute_weights()

    print("physical yields (subsampled MC, weights x 1/FRAC):")
    yields = [w[i] * len(procs[i]) for i in range(4)]
    approx(sum(yields[1:]), 411.30, 1.0, "total background yield")
    approx(yields[0], 9.38, 0.1, "signal yield")

    print("weight-bug fix -- class-balanced training weights have equal totals:")
    full = st["train"]
    sig = (full["_proc"] == 0).values
    bw = util.class_balanced_weights(sig, full["_w"].values)
    approx(bw[sig].sum(), bw[~sig].sum(), 1e-6, "signal vs background total weight")
    approx(bw.mean(), 1.0, 1e-6, "mean training weight (normalized)")

    print("GLRT mass fit, no classifier (100-200 GeV, 20 bins):")
    S, B, obs = H._templates(st)
    g = H.glrt(S, B, obs)
    approx(g["mu_hat"], 1.10, 0.15, "mu_hat (~ Standard Model value 1)")
    approx(g["Z_asymptotic"], 2.29, 0.15, "Z_asymptotic")
    tp = H.toy_pvalue(S, B, obs, n_toys=2000)
    approx(tp["p_value"], 0.013, 0.010, "toy p-value")

    print("classifier ladder AUC (mass-blind raw 4-momenta):")
    targets = {"linear": 0.638, "quadratic": 0.905, "mlp": 0.955}
    rows = {}
    for kind, tgt in targets.items():
        mdl, fx = H.make_classifier(kind, st["train"])
        rows[kind] = (mdl, fx)
        approx(H.auc(mdl, fx, st["holdout"]), tgt, 0.03, f"AUC {kind}")

    print("leaderboard 2D expected Z (MC-only) and sideband retention:")
    approx(H.mass_only_expected_Z(st), 2.31, 0.05, "mass-only baseline")
    expz = {"linear": 2.31, "quadratic": 2.66, "mlp": 2.56}
    sbr = {"linear": 0.49, "quadratic": 0.11, "mlp": 0.03}
    for kind, (mdl, fx) in rows.items():
        approx(H.expected_Z_2d(mdl, fx, st), expz[kind], 0.10, f"2D expected Z {kind}")
        approx(H.sideband_retention(mdl, fx, st), sbr[kind], 0.05, f"sideband ret {kind}")
    # the load-bearing ordering: better classifier can only add information,
    # and AUC is not the physics metric (MLP tops AUC but not expected Z)
    assert H.expected_Z_2d(*rows["quadratic"], st) > H.mass_only_expected_Z(st)
    assert H.expected_Z_2d(*rows["mlp"], st) < H.expected_Z_2d(*rows["quadratic"], st)
    print("  ok  ordering: quadratic > baseline, and MLP(top AUC) < quadratic on expected Z")

    print("luminosity projection reaches 5 sigma:")
    proj = dict((f, z) for f, s, b, z in H.luminosity_projection(st))
    approx(proj[1], 2.47, 0.10, "1x expected Z")
    assert proj[6] >= 5.0, f"6x expected Z {proj[6]:.2f} < 5"
    print(f"  ok  6x luminosity expected Z = {proj[6]:.2f} >= 5")

    print("\nALL ANCHORS OK")


if __name__ == "__main__":
    main()

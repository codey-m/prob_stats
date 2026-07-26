import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Process bookkeeping
#
# The final project keeps four processes after the H->ZZ->4l event selection:
# the Higgs signal and the three irreducible ZZ->4l backgrounds.
#
# The reducible backgrounds (Drell-Yan, ttbar) are NOT shipped -- but note this
# is a simplification, not a claim that they are truly negligible.  Their summed
# expected yield (~10 events) is comparable to the ~9.4-event Higgs signal, with
# ~5.8 events inside the 100-200 GeV fit window.  They are omitted because the
# available MC has only 4/8/2 retained rows for them, far too few to estimate a
# mass shape reliably (drawing a large sample would just duplicate those rows,
# not add information).  A real scientific analysis would need substantially more
# simulation of these rare channels; this teaching dataset does not have it.
#
# Nothing in this project models them or corrects for them.  The shape tilt in
# higgs_analysis.glrt_shape() is a generic one-parameter flexibility check, not a
# stand-in for these processes, and no shipped calculation estimates what adding
# them would do.  Treat the omission as a stated limitation on every number the
# project reports -- an unmodeled process is one of the things that could produce
# an apparent excess (notebook Section 9).
#
# The shipped MC files are a fixed-seed 25% subsample of the full retained MC,
# kept small enough to live in the repo.  Each retained event therefore stands
# in for 1 / MC_SUBSAMPLE_FRACTION physical events; compute_weights() folds that
# factor into the per-event weight so expected yields are preserved.
# ---------------------------------------------------------------------------

# Resolve data relative to this file so the project runs from any directory.
_HERE = os.path.dirname(os.path.abspath(__file__))


def _data_path(*parts):
    """Path under this project's data/ dir, or the same path relative to CWD
    (the Colab bootstrap downloads into the working directory)."""
    here = os.path.join(_HERE, "data", *parts)
    if os.path.exists(here):
        return here
    return os.path.join("data", *parts)


MC_SUBSAMPLE_FRACTION = 0.25

PROCESS_NAMES = ["higgs", "zz4mu", "zz2mu2e", "zz4e"]
PROCESS_FILES = [
    "higgs2012.csv",
    "zzto4mu2012.csv",
    "zzto2mu2e2012.csv",
    "zzto4e2012.csv",
]


def load_processes():
    """Return the four MC process DataFrames: [higgs, zz4mu, zz2mu2e, zz4e]."""
    return [
        pd.read_csv(_data_path("MC", fname), index_col=None, header=0)
        for fname in PROCESS_FILES
    ]


def load_expr_data():
    return pd.read_csv(_data_path("data", "clean_data_2012.csv"), index_col=None, header=0)


"""
Physical per-event weights for [higgs, zz4mu, zz2mu2e, zz4e].

weight_k = luminosity * cross_section_k / n_generated_k / MC_SUBSAMPLE_FRACTION

The weight is the number of expected events represented by one retained MC row:
summing it over a process's rows gives that process's expected yield.  The
signal (Higgs) weight is left at its physical value; balancing signal against
background for classifier training is a separate, per-split step (see
class_balanced_weights), not a physical weight.
"""

def compute_weights():
    lumi = 11580.

    # cross sections (pb), aligned with PROCESS_NAMES
    xsec = np.array([0.0065, 0.107, 0.249, 0.107])

    # number of MC events generated for each process
    nevt = np.array([299973, 1499064, 1497445, 1499093], dtype=float)

    weights = lumi * xsec / nevt / MC_SUBSAMPLE_FRACTION
    return weights


"""
Class-balanced training weights for approximating h*(x) = log(Q/P0).

A classifier's log-odds converge to h* plus a constant log(nu_1/nu_0) set by
the class proportions.  Equal class totals (nu_0 = nu_1) make that constant
zero, so the trained log-odds read as h* directly.  This is a convenience, not
a Neyman-Pearson requirement: the constant is the same for every event, so
rankings, AUC, and quantile-based score bins are unaffected by it.

Rescales the physical weights so the two classes carry equal total weight, then
normalizes to unit mean so a regularization strength C stays on a stable scale.
Each class is multiplied by a single factor, so the relative weights of rows
within a class are preserved.

Input:
    signal_mask      : boolean array, True for signal (Higgs) rows
    physical_weights : per-row physical weights (from compute_weights, expanded)
Output:
    balanced per-row weights with equal class totals and unit mean.
"""

def class_balanced_weights(signal_mask, physical_weights):
    signal_mask = np.asarray(signal_mask, dtype=bool)
    w = np.asarray(physical_weights, dtype=float).copy()
    total_background = w[~signal_mask].sum()
    w[signal_mask] *= total_background / w[signal_mask].sum()
    w *= len(w) / w.sum()
    return w


"""
Split each process into a training part and a held-out part.

train_processes  : used to FIT the classifier.
holdout_processes: never seen in training; used for fair AUC / expected-Z
                   evaluation in the Section 8 model comparison.

The split is per-process so class proportions are preserved.  A single fixed
seed keeps the holdout locked across runs.
"""

def split(processes, test_size=0.3, random_state=0):
    train_processes = []
    holdout_processes = []
    for process in processes:
        train_process, holdout_process = train_test_split(
            process, test_size=test_size, random_state=random_state
        )
        train_processes.append(train_process)
        holdout_processes.append(holdout_process)
    return train_processes, holdout_processes

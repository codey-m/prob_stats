import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder
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
# The notebook treats their omission as a background systematic, not a free pass.
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
    """Return [higgs, zz4mu, zz2mu2e, zz4e] with a `signal` column (1 for Higgs)."""
    processes = [
        pd.read_csv(_data_path("MC", fname), index_col=None, header=0)
        for fname in PROCESS_FILES
    ]
    for i in range(len(processes)):
        label = 1.0 if i == 0 else 0.0
        processes[i] = processes[i].assign(signal=np.full(processes[i].shape[0], label))
    return processes


def load_expr_data():
    return pd.read_csv(_data_path("data", "clean_data_2012.csv"), index_col=None, header=0)


"""
Return OH_encoder for categorical variables based on entire training data.

Input:
    processes_mc : entire mc training data
    object_cols  : categorical variables
Output:
    OH_encoder based on training data.
"""

def encoder(processes_mc, object_cols):
    reference_data = pd.concat(processes_mc, axis=0)

    OH_encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    OH_encoder.fit(reference_data[object_cols])
    return OH_encoder


"""
Remove irrelevant predictors and One-Hot encode categorical variables.

OH_encoder      : one-Hot encoder to transform categorical variables.
object_cols     : categorical predictors
irrelevant_cols : irrelevant predictors to drop
processes_mc    : MC data to be transformed
expr_data       : real experimental data to transform

Output:
    expr_data, processes_mc after being modified
"""

def trim(OH_encoder, object_cols, irrelevant_cols, processes_mc, expr_data):
    expr_data = expr_data.drop(irrelevant_cols, axis=1)

    OH_cols_data = pd.DataFrame(OH_encoder.transform(expr_data[object_cols]))

    # One-hot encoding removed index; put it back
    OH_cols_data.index = expr_data.index

    # Remove categorical columns (will replace with one-hot encoding)
    num_data = expr_data.drop(object_cols, axis=1)

    # Add one-hot encoded columns to numerical features
    expr_data = pd.concat([num_data, OH_cols_data], axis=1)

    for i in range(len(processes_mc)):
        processes_mc[i] = processes_mc[i].drop(irrelevant_cols, axis=1)

        OH_cols_mc = pd.DataFrame(OH_encoder.transform(processes_mc[i][object_cols]))

        # One-hot encoding removed index; put it back
        OH_cols_mc.index = processes_mc[i].index

        # Remove categorical columns (will replace with one-hot encoding)
        num_mc = processes_mc[i].drop(object_cols, axis=1)

        # Add one-hot encoded columns to numerical features
        processes_mc[i] = pd.concat([num_mc, OH_cols_mc], axis=1)

    return expr_data, processes_mc


"""
Physical per-event weights for [higgs, zz4mu, zz2mu2e, zz4e].

weight_k = luminosity * cross_section_k / n_generated_k / MC_SUBSAMPLE_FRACTION

The weight is the number of expected events represented by one retained MC row:
summing it over a process's rows gives that process's expected yield.  Unlike
the original util.py, the signal (Higgs) weight is left at its physical value
here -- balancing signal against background for classifier training is a
separate, per-split step (see class_balanced_weights), not a physical weight.
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

The Neyman-Pearson connection (a classifier's log-odds -> h*) requires equal
total signal and background weight in training (nu_0 = nu_1).  This rescales the
physical weights so the signal class and background class carry equal total
weight, then normalizes to unit mean so a regularization strength C stays on a
stable scale.

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
    n_signal = signal_mask.sum()
    w[signal_mask] = total_background / n_signal
    w *= len(w) / w.sum()
    return w


"""
Split each process into a training part and a held-out part.

train_processes  : used to FIT the classifier.
holdout_processes: never seen in training; used for fair AUC / expected-Z
                   evaluation on the leaderboard.

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

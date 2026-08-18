# Higgs boson final project

This capstone uses real CMS data from the 2012 Higgs search to ask what claim a
single analysis can support. It combines a classifier, a generalized
likelihood-ratio test, simulation-calibrated p-values, goodness-of-fit, a
background-shape sensitivity check, and a power calculation.

## Source of truth

`higgs_final_project.ipynb` is the sole learner notebook and the source of
truth for the published artifact. It is deliberately output-free. The older
executed demonstration has been retired outside this public directory; neither
it nor any notebook under `Prob_SDA/Projects/Project-2/` should be copied back.

The notebook's Colab rendering is part of the release contract. The local
release checker preserves and verifies its `<font>` + `<hr>` callouts, native
Markdown task headings, clean outputs, and stable cell IDs. In particular, the
older inline-CSS `<div style=...>` callouts are not release-compatible.

A solved, cell-matched derivative is generated privately at
`../solutions/final_project/higgs_final_project_solution.ipynb`. It exists only
for end-to-end validation and is excluded from the public allowlist.

## Files

| file | purpose |
|---|---|
| `higgs_final_project.ipynb` | clean learner notebook; canonical source |
| `util.py` | data loading, physical event weights, and train/holdout split |
| `higgs_analysis.py` | tested reference computations used by checkpoints |
| `test_higgs.py` | numerical regression anchors |
| `release_manifest.json` | release ref, public-file hashes, and notebook/style contract |
| `tested_environments.json` | exact environments in which the anchors passed |
| `make_subsample.py` | regenerates the fixed 25% MC subsample |
| `data/` | experimental events, MC subsample, provenance, and checksums |

## Run locally

```bash
python -m pip install -r requirements.txt
jupyter notebook higgs_final_project.ipynb
python test_higgs.py
```

The code resolves data paths relative to the project, so it can run from any
working directory. In Colab, Section 0 verifies the SHA-256 digest of every
helper and data file and downloads a missing or mismatched file from the exact
Git ref embedded in the notebook. The current delivery policy uses `main`.
Digest verification prevents a changed file from being accepted silently.

## Verify a release candidate

From `ProbStatsLabs/`:

```bash
python generators/build_final_project_release.py --check --render --execute-reference
```

The current candidate explicitly uses `main`, matching the OLX and faculty
links. `--release-check` rejects an unconfigured placeholder, stale digests, or
a launch link that does not match the configured ref. This keeps the Git
workflow simple while still failing safely if a helper or data file changes
without a corresponding notebook rebuild.

Because `main` is mutable, an older saved notebook may be unable to restore its
original dependencies after those files change upstream. If the project later
moves to an enterprise repository or needs long-lived offering snapshots, the
same builder can switch the repository/ref policy then.

## Data limitation

The shipped model includes the Higgs signal and three simulated ZZ background
processes. Drell–Yan and ttbar samples are not shipped or corrected for. This is
a limitation of every result produced by the project, not an effect that has
already been accounted for; `data/MANIFEST.md` records the full provenance.

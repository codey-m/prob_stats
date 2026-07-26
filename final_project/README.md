# Higgs boson — final project

A capstone that reproduces the *logic* of the 2012 Higgs search on real CMS
open data, using the tools of the course: a classifier as a likelihood-ratio
approximation (Neyman–Pearson), a **generalized likelihood-ratio test** with a
nuisance parameter, toy-based p-values, goodness-of-fit and systematics, and a
**power calculation**.

## The honest result

A binned-Poisson GLRT mass fit finds an excess near 125 GeV at **μ̂ ≈ 1.1**
(consistent with the Standard Model), but only **~2.3σ** — and just **~1.4σ**
once the background *shape* is allowed one degree of freedom, with a wide 95%
interval μ ∈ [0.14, 2.35]. This is a **hint, not evidence, and not a discovery.**
That is the correct outcome for ~500 events in one channel: the July 2012
discovery came from *combining* channels (H→γγ, H→ZZ→4ℓ, H→WW) across ATLAS and
CMS, and the four-lepton channel alone reached 5σ only with the full 2011+2012
dataset. A power calculation shows this channel needs roughly an order of
magnitude more data (or a better analysis) for a confident 5σ.

The **observed result uses only the mass fit — not the classifier.** The
classifier is the *leaderboard* exercise (below).

## Files

| file | purpose |
|---|---|
| `higgs_final_project.ipynb` | the notebook you work in (runs top-to-bottom) |
| `util.py` | data loading, physical event weights, train/holdout split |
| `higgs_analysis.py` | the fixed analysis: GLRT, systematics, power, leaderboard metric |
| `test_higgs.py` | regression anchors (`python test_higgs.py` or `pytest`) |
| `make_subsample.py` | regenerates the shipped 25% MC subsample (seed 6372) |
| `data/` | experimental events + MC subsample (`data/MANIFEST.md` has provenance + checksums) |

## Run it

```bash
pip install -r requirements.txt
jupyter notebook higgs_final_project.ipynb     # or open the Colab badge in the notebook
python test_higgs.py                           # verify the anchors
```

The code resolves data paths relative to the project, so it runs from any
directory. Opened standalone in Colab, the notebook's Section 0 downloads the
helper modules and data from GitHub.

## The leaderboard (classifier exercise)

Students supply a score `h(x)` over the **mass-blind raw four-momenta**. Entries
are ranked by the **expected significance of the full analysis** on **held-out
MC** (a 2D mass×score GLRT — the score as a fit dimension, never a cut, never the
real 495 events, never the classifier's own training rows). The lesson: AUC is
*not* the physics metric. A 3-layer net reaches the highest AUC (~0.96) yet the
*lowest* expected Z of the classifiers, because it re-learned the mass and is
redundant with the axis already fit; the quadratic model wins. To beat the
baseline you need discrimination **decorrelated from mass** — the on-ramp to the
next course.

## Notes

- The Colab bootstrap in Section 0 pulls from the `main` branch. For a frozen
  offering, pin it to a release tag/commit.
- Reducible backgrounds (Drell–Yan, t̄t) are omitted and handled as a systematic;
  see `util.py` and the notebook's Section 5.

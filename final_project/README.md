# Higgs boson final project

A capstone on real CMS open data: the 2012 four-lepton Higgs search, rerun with
the tools of this course. A classifier approximates a likelihood ratio
(Neyman-Pearson), a generalized likelihood-ratio test with a nuisance parameter
tests for the signal, toys calibrate the p-value, goodness-of-fit and a shape
systematic stress the model, and a power calculation prices a real discovery.

## The result

A binned-Poisson GLRT mass fit finds an excess near 125 GeV at mu_hat of about
1.1, consistent with the Standard Model, at about 2.3 sigma. Allow the
background shape one degree of freedom and the significance drops to about 1.4
sigma. The 95 percent interval tells the same story: [0.14, 2.35] with the
shape held at the MC prediction, [0.00, 2.04] with the shape free. The second
interval does not exclude mu = 0, so the exclusion in the first belongs to the
fixed-shape assumption, not to the data; quote it only with that label. This is
a hint, not evidence, and not a discovery, which is the correct outcome for
roughly 500 events in one channel. The 2012 discovery combined three channels
across two experiments, and the four-lepton channel alone crossed 5 sigma only
with about twice this data. The power calculation says a confident 5 sigma in
this channel needs close to an order of magnitude more.

The observed result uses only the mass fit. The classifiers are compared
separately (notebook Section 8).

## Files

| file | purpose |
|---|---|
| `higgs_final_project.ipynb` | the notebook you work in (runs top-to-bottom) |
| `util.py` | data loading, physical event weights, train/holdout split |
| `higgs_analysis.py` | the fixed analysis: GLRT, systematics, power, model-comparison metric |
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

## Section 8: what does the analysis gain from a classifier?

Each classifier is scored by the expected significance of the full analysis on
held-out MC: a 2D mass-by-score GLRT, never a cut, never the real 495 events,
never a model's own training rows. Two reference rows make the comparison
honest. The 2D fit uses 20 mass bins by 4 score bins, so 80 Poisson cells,
while the Section 4 mass fit uses 20; more cells raise the expected
significance with no classifier involved. The mass tag is a control carrying
nothing but mass.

| entry | AUC | expected Z | sideband ret. |
|---|---:|---:|---:|
| mass-only, 20 cells | | 2.35 | |
| mass-only, 80 cells (capacity-matched) | | 2.72 | |
| mass tag, `-abs(m-125)`, no new info | 0.984 | 2.70 | 0.00 |
| linear | 0.632 | 2.36 | 0.50 |
| quadratic | 0.906 | 2.71 | 0.12 |
| 3-layer neural net | 0.961 | 2.42 | 0.03 |

Two findings. The AUC ordering does not match the expected-Z ordering, so the
best separator is not the most useful model. And no classifier beats the
capacity-matched 2.72: the quadratic ties it, the other two lose to it, and the
control score reproduces almost the entire apparent gain over 2.35. The
improvement was resolution, not information, and the 20-cell comparison credited
the classifiers for degrees of freedom rather than physics. That is the
transferable lesson: before believing a model beat a simpler one, check that the
baseline was given the same capacity.

Why the net lands at 2.42 while the quadratic reaches 2.71 is not resolved here;
both track the mass peak about equally well. A real gain would need
discrimination decorrelated from mass, which in this channel means reconstructing
the Z pair, physics beyond this course.

## Notes

- The Colab bootstrap in Section 0 pulls from the `main` branch. For a frozen
  offering, pin it to a release tag or commit.
- The Drell-Yan and ttbar backgrounds are omitted and not modeled anywhere; no
  shipped calculation estimates their effect. This is a stated limitation on
  every reported number, not a correction that has been applied. See `util.py`
  and notebook Sections 1 and 9.

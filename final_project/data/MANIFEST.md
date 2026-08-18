# Data manifest

## Provenance

CMS Open Data, 2012 proton-proton collisions at 8 TeV, H→ZZ→4ℓ selection
(~11.6 fb⁻¹; the `lumi = 11580` pb⁻¹ constant in `util.py`). This is roughly
half the full 2012 four-lepton dataset (19.7 fb⁻¹) and excludes the 2011 run.
Notebook Section 6 covers why that matters for the result.

- `data/data/clean_data_2012.csv` contains the experimental events (495 rows).
- `data/MC/*.csv` is a fixed-seed 25% subsample of the full retained Monte
  Carlo for the Higgs signal and the three ZZ→4ℓ backgrounds. Regenerate with
  `python make_subsample.py --source <dir-with-full-CSVs>` (seed 6372,
  fraction 0.25). Each retained row represents 1/0.25 = 4 events;
  `util.compute_weights()` folds that factor in so expected yields are
  preserved.

The Drell-Yan and ttbar backgrounds are not shipped (too few retained MC rows
to model a mass shape). They are not modeled or corrected for anywhere in the
project, and no shipped calculation estimates what including them would
change. Their omission is a stated limitation on every reported number, not an
effect that has been accounted for; their combined yield (about 10 events) is
comparable to the 9.4-event Higgs signal.

## Files (SHA-256)

| file | rows | sha256 |
|---|---:|---|
| `data/data/clean_data_2012.csv` | 495 | `965d8e81b321735fab9252336cda11aa7a036f9e716be7ddd01bb3f3d70998b4` |
| `data/MC/higgs2012.csv` | 9348 | `0e56a7acb6575a434f1d1c3b33b25386aa0a2b56a415d08a5aa082b7d37c5528` |
| `data/MC/zzto4mu2012.csv` | 41106 | `44da5a988429fbf1c5de621dd38add96a01cf75ccf29ff9dff3d74eb18b72764` |
| `data/MC/zzto2mu2e2012.csv` | 26537 | `332fb63df9ed5307faf37c61c325b4ba311471675ef93b2eeee79ebc01e12d2a` |
| `data/MC/zzto4e2012.csv` | 21476 | `82c09cffa38b839da42f9f11402327e5ab45f38423c187c003880712d7507800` |

## Expected physical yields (after 1/fraction reweighting)

| process | yield |
|---|---:|
| higgs (signal) | 9.38 |
| zz4mu | 135.91 |
| zz2mu2e | 204.39 |
| zz4e | 71.00 |
| total background | 411.30 |
| observed data | 495 |

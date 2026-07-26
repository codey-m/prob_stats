# Data manifest

## Provenance

CMS Open Data, 2012 proton–proton collisions at √s = 8 TeV, H→ZZ→4ℓ selection
(~11.6 fb⁻¹, the `lumi = 11580` pb⁻¹ constant in `util.py`). This is roughly
**half** the full 2012 four-lepton dataset (19.7 fb⁻¹) and excludes the 2011
7-TeV run — see the notebook's Section 6 for why that makes the result a hint
rather than a discovery.

- `data/data/clean_data_2012.csv` — the experimental events (495 rows).
- `data/MC/*.csv` — a fixed-seed **25% subsample** of the full retained Monte
  Carlo for the Higgs signal and the three irreducible ZZ→4ℓ backgrounds.
  Regenerate with `python make_subsample.py --source <dir-with-full-CSVs>`
  (seed 6372, fraction 0.25). Each retained row represents 1/0.25 = 4 events;
  `util.compute_weights()` folds that factor in so expected yields are preserved.

The reducible Drell–Yan and t̄t backgrounds are **not** shipped (too few retained
MC rows to model a shape); their omission is treated as a systematic in the
notebook, not assumed negligible.

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
| **total background** | **411.30** |
| observed data | 495 |

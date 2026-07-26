"""Reproduce the shipped 25% Monte-Carlo subsample.

The four signal/ZZ MC files are large (~123 MB).  The project ships a fixed-seed
25% subsample (~27 MB) instead; each retained row stands in for 1/0.25 = 4
events, and util.compute_weights() folds that factor into the per-event weight so
expected yields are preserved.

This script regenerates the shipped CSVs bit-for-bit from the full files.  Point
--source at the directory holding the full-size CSVs.

    python make_subsample.py --source ~/Downloads

Verify the output matches the shipped data with the checksums in data/MANIFEST.md.
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 6372
FRACTION = 0.25
FILES = ["higgs2012.csv", "zzto4mu2012.csv", "zzto2mu2e2012.csv", "zzto4e2012.csv"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, default=Path.home() / "Downloads",
                    help="directory containing the full-size MC CSVs")
    ap.add_argument("--out", type=Path, default=Path(__file__).parent / "data" / "MC",
                    help="output directory for the subsampled CSVs")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    # A single RNG is advanced across the four files, in this fixed order, so the
    # result is deterministic and reproducible.
    rng = np.random.default_rng(SEED)
    for fname in FILES:
        src = args.source / fname
        if not src.exists():
            raise FileNotFoundError(f"full-size MC not found: {src}")
        d = pd.read_csv(src)
        k = int(round(len(d) * FRACTION))
        idx = np.sort(rng.choice(len(d), size=k, replace=False))
        d.iloc[idx].reset_index(drop=True).to_csv(args.out / fname, index=False)
        print(f"{fname}: {len(d)} -> {k} rows")

    print(f"\nwrote {len(FILES)} files to {args.out}")
    print("verify against data/MANIFEST.md checksums")


if __name__ == "__main__":
    main()

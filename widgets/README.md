# Probability & SDA widgets

The interactive widgets in the Probability & SDA courses on MIT Learn. The courses load each widget from
this folder through GitHub Pages, so every link below opens the exact page learners see inside
the lesson.

## 6.3710.1x Probability & SDA: Foundations & Exploratory Data Analysis

| Widget | Where | What it shows |
| --- | --- | --- |
| [Beach Beeps](https://codey-m.github.io/prob_stats/widgets/widget-bayes-base-rate.html) | Unit 1, Lec. 2: Conditioning and Bayes' rule | Bayes' rule and the base rate |

## 6.3710.2x Probability & SDA: Discrete Distributions & Categorical Data

| Widget | Where | What it shows |
| --- | --- | --- |
| [Discrete distributions: PMF and CDF](https://codey-m.github.io/prob_stats/widgets/widget-discrete-dist.html) | Unit 1, Lec. 1: PMFs and expectation |  |

## 6.3710.3x Probability & SDA: Multivariate Statistics & Bayesian Inference

| Widget | Where | What it shows |
| --- | --- | --- |
| [Bivariate normal: correlation and conditioning](https://codey-m.github.io/prob_stats/widgets/widget-bvn-ellipse.html) | Unit 1, Lec. 2: Sums, covariance, and correlation | Correlation and conditioning |
| [Bayesian updating: prior, likelihood, posterior](https://codey-m.github.io/prob_stats/widgets/widget-bayes-update.html) | Unit 2, Lec. 5: Linear models with normal noise | Bayesian updating |

## 6.3710.4x Probability & SDA: Uncertainty Quantification & Data-Driven Decisions

| Widget | Where | What it shows |
| --- | --- | --- |
| [Mean Flights](https://codey-m.github.io/prob_stats/widgets/widget-clt.html) | Unit 1, Lec. 2: The central limit theorem | The Central Limit Theorem |

## 6.3710.5x Probability & SDA: Hypothesis Testing & Machine Learning Model Validation

| Widget | Where | What it shows |
| --- | --- | --- |
| [Wonder Fold](https://codey-m.github.io/prob_stats/widgets/widget-ht-power.html) | Unit 2, Lec. 6: Power and optimal tests | Significance, error, and power |

## Review tips

- Each widget is one self-contained HTML file. It makes no network requests, so a downloaded copy works too.
- In the course each widget sits in a column about 880 pixels wide. Narrow the browser window to that width to see the layout learners get.

## How this folder works

Nothing here is edited by hand. Each widget is developed in the course repository, and that
repository's `docs/publish_widgets.py` copies it here and rewrites this README. A push to `main`
updates the live widget a minute or two later, with no course import. The repository name is part
of every widget address, so it must never change.

# Probability & SDA coding activities

Labs, coding practices, and the final-project notebook for the five Probability & Statistical Data Analysis courses on MIT Learn, `6.3710.1x` through `6.3710.5x`.

The five labs follow one dataset through the whole sequence: rock crabs, from Weldon's 1893 question about ordinary variation to a model comparison on 200 measured specimens. Short practices focus on one procedure. The final project asks what a single analysis of real CMS data from the 2012 Higgs search can support. For the course's interactive widgets, glossaries and notation guide, see the [widget catalog](widgets/README.md).

## Open a notebook

Use a notebook's **Colab** link below, then choose **File → Save a copy in Drive** to keep your own editable copy. Follow its setup cells. Each lab loads its data file (`crabs_module1.csv` through `crabs_module5.csv`) from this repository when it is not beside the notebook. Course pages contain the associated assessment and submission instructions.

Some short practices also have a **Browser** link. It runs the same task with Python in your browser, with no account or setup, and shows what your functions return. Some browser versions use a simpler interface than the notebook. Your code stays in that page; use **Download Python** to keep a copy.

## 6.3710.1x Probability & SDA: Foundations & Exploratory Data Analysis

| Activity | What you do | Run |
| --- | --- | --- |
| Lab 1: [Look & Ask](module1_lab.ipynb) | Inspect 50 of the crabs Weldon measured, compute the ratio of frontal lobe to shell length, and see how bin width changes what a histogram appears to show. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/module1_lab.ipynb) |

## 6.3710.2x Probability & SDA: Discrete Distributions & Categorical Data

| Activity | What you do | Run |
| --- | --- | --- |
| Lab 2: [Count & Classify](module2_lab.ipynb) | Turn binned ratios for 100 labeled crabs into an empirical PMF, compute its expectation and variance, and use conditional PMFs and a contingency table to ask whether the ratio depends on sex. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/module2_lab.ipynb) |

## 6.3710.3x Probability & SDA: Multivariate Statistics & Bayesian Inference

| Activity | What you do | Run |
| --- | --- | --- |
| Lab 3: [Measure & Relate](module3_lab.ipynb) | Use five body measurements on 200 crabs to build covariance matrices, draw normal ellipses from an eigendecomposition, and look for structure that sex alone does not explain. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/module3_lab.ipynb) |
| Practice: [A Bayesian update in code](practice/module3_practice_posterior.ipynb) | Write the normal-normal update, apply it one observation at a time, and check that it matches a single batch update. The browser activity draws each prior, likelihood and posterior from the values your function returns. | [Browser](https://codey-m.github.io/prob_stats/practice/posterior/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module3_practice_posterior.ipynb) |

## 6.3710.4x Probability & SDA: Uncertainty Quantification & Data-Driven Decisions

| Activity | What you do | Run |
| --- | --- | --- |
| Lab 4: [See the Unseen](module4_lab.ipynb) | Compare the direction that preserves the most variation with the one that best separates the crab groups, bootstrap two statistics, compare two confidence-interval constructions, and fit one- and two-component Gaussian models. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/module4_lab.ipynb) |
| Practice: [Bootstrap a standard error](practice/module4_practice_bootstrap.ipynb) | Resample with replacement to estimate the standard error of a sample mean. The browser activity shows each resample your function returns and builds the distribution of their means. | [Browser](https://codey-m.github.io/prob_stats/practice/bootstrap/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module4_practice_bootstrap.ipynb) |
| Practice: [Maximize a likelihood](practice/module4_practice_mle.ipynb) | Write the exponential log-likelihood and its maximizer. The browser activity plots your log-likelihood across candidate rates and marks your estimate on the curve. | [Browser](https://codey-m.github.io/prob_stats/practice/mle/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module4_practice_mle.ipynb) |

## 6.3710.5x Probability & SDA: Hypothesis Testing & Machine Learning Model Validation

| Activity | What you do | Run |
| --- | --- | --- |
| Lab 5: [One Line or Many?](module5_lab.ipynb) | Test whether one line relating shell length to frontal lobe size fits all 200 crabs, comparing pooled and group-aware models with a nested-model test and five-fold cross-validation. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/module5_lab.ipynb) |
| Practice: [Classification accuracy](practice/module5_practice_classification.ipynb) | Turn model scores into class predictions and measure accuracy. The browser activity places each case in a confusion-matrix cell according to your predictions. | [Browser](https://codey-m.github.io/prob_stats/practice/classification/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module5_practice_classification.ipynb) |
| Practice: [Fit a line](practice/module5_practice_regression.ipynb) | Fit a least-squares line to a few points and read off its slope and R-squared. The browser activity draws your line with each residual. | [Browser](https://codey-m.github.io/prob_stats/practice/regression/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module5_practice_regression.ipynb) |
| Practice: [A z-test in code](practice/module5_practice_ztest.ipynb) | Standardize an observed mean under the null hypothesis and convert it to a two-sided p-value. The browser activity shades the tails your statistic implies and compares them with the p-value you return. | [Browser](https://codey-m.github.io/prob_stats/practice/ztest/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module5_practice_ztest.ipynb) |

## Final project

| Project | What you investigate | Run |
| --- | --- | --- |
| [Discovery of the Higgs boson](final_project/higgs_final_project.ipynb) | Work with real CMS four-lepton events from the 2012 search. Build a test statistic from a classifier, run a likelihood-ratio test with a floating background, calibrate p-values by simulation, and check goodness of fit, sensitivity to the background shape, and power. The [project guide](final_project/README.md) covers its files, data provenance and local setup. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/final_project/higgs_final_project.ipynb) |

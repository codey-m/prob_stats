# Probability & SDA activities

Labs, coding practices, optional reviews, and the final-project notebook for the five Probability & Statistical Data Analysis courses on MIT Learn, `6.3710.1x` through `6.3710.5x`.

The five labs follow one dataset through the whole sequence: rock crabs, from Weldon's 1893 question about ordinary variation to a model comparison on 200 measured specimens. Short practices focus on one procedure. The final project asks what a single analysis of real CMS data from the 2012 Higgs search can support. For the course's interactive widgets, glossaries and notation guide, see the [widget catalog](widgets/README.md).

## Optional reviews

These ungraded activities revisit methods from earlier units, with reminders and practice that unfolds as you work. No programming is needed.

Mathematics refreshers: [limits of a double integral](https://codey-m.github.io/prob_stats/practice/integration_bounds/), [integrating a density](https://codey-m.github.io/prob_stats/practice/density_integrals/), [finding a maximum or minimum](https://codey-m.github.io/prob_stats/practice/max_min/), [limits as something grows](https://codey-m.github.io/prob_stats/practice/limits/), and [the chain rule](https://codey-m.github.io/prob_stats/practice/chain_rule_cdf/). Before Problem Set 2 of `6.3710.2x`, the [calculus check](https://codey-m.github.io/prob_stats/practice/ps2_calculus_check/) has one short task for each piece the set uses and points to the refresher for any you miss.

| Spiral review | What you practice |
| --- | --- |
| [Spread and precision](https://codey-m.github.io/prob_stats/practice/spread_and_precision/) | Distinguish individual variation from the precision of a sample mean. |
| [Conditioning and independence](https://codey-m.github.io/prob_stats/practice/conditioning_and_independence/) | Retain cases matching a known event and normalize their probabilities. |
| [Variance of sums and averages](https://codey-m.github.io/prob_stats/practice/variance_of_sums/) | Track shared components and account for covariance and scaling. |
| [Posterior summaries](https://codey-m.github.io/prob_stats/practice/posterior_summaries/) | Choose estimates for exact matches or squared error, and retain uncertainty. |
| [Combining conditional results](https://codey-m.github.io/prob_stats/practice/total_probability_and_expectation/) | Weight within-group results to recover population probabilities and means. |
| [Comparing likelihoods](https://codey-m.github.io/prob_stats/practice/likelihood_and_fit/) | Compare candidate means using the same observations. |
| [Counting successes](https://codey-m.github.io/prob_stats/practice/binomial_counts/) | Build sequence probabilities and count arrangements of successes. |

## Open a notebook

Use a notebook's **Colab** link below, then choose **File → Save a copy in Drive** to keep your own editable copy. Follow its setup cells. Each lab loads its data file (`crabs_module1.csv` through `crabs_module5.csv`) from this repository when it is not beside the notebook. Course pages contain the associated assessment and submission instructions.

Some short coding practices also have a **Browser** link, and a few run only in the browser. A browser activity runs Python on your device, with no account or setup, and shows what your functions return. Where there is also a notebook, the browser version may use a simpler interface. Your code stays in that page; use **Download Python** to keep a copy.

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
| Practice: [Maximize a likelihood](practice/module4_practice_mle.ipynb) | Write the exponential log-likelihood and its maximizer. The browser activity plots your log-likelihood across candidate rates and marks your estimate on the curve. Without code, compute one term, drag to the curve's peak and pick the formula that lands there. | [Browser](https://codey-m.github.io/prob_stats/practice/mle/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module4_practice_mle.ipynb) |
| Practice: [Rows, columns, coordinates](https://codey-m.github.io/prob_stats/practice/pca_axes/) | Center each feature of a small table, then project one observation onto supplied PCA directions. Work out a single entry by hand, or write NumPy for every entry. On a square table, a mean taken along the wrong axis still returns an array of the right shape. | [Browser](https://codey-m.github.io/prob_stats/practice/pca_axes/) |
| Practice: [One result per resample](https://codey-m.github.io/prob_stats/practice/bootstrap_workflow/) | Write the kind of loop Lab 4 asks for: each replicate builds a sample of whole paired rows, evaluates its covariance and stores the result at its own position. Plan the steps with menus first; the browser activity steps through every replicate your loop returns and stacks its stored result. | [Browser](https://codey-m.github.io/prob_stats/practice/bootstrap_workflow/) |

## 6.3710.5x Probability & SDA: Hypothesis Testing & Machine Learning Model Validation

| Activity | What you do | Run |
| --- | --- | --- |
| Lab 5: [One Line or Many?](module5_lab.ipynb) | Test whether one line relating shell length to frontal lobe size fits all 200 crabs, comparing pooled and group-aware models with a nested-model test and five-fold cross-validation. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/module5_lab.ipynb) |
| Practice: [Classification accuracy](practice/module5_practice_classification.ipynb) | Turn model scores into class predictions and measure accuracy. The browser activity places each case in a confusion-matrix cell according to your predictions. | [Browser](https://codey-m.github.io/prob_stats/practice/classification/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module5_practice_classification.ipynb) |
| Practice: [Fit a line](practice/module5_practice_regression.ipynb) | Fit a least-squares line to a few points and read off its slope and R-squared. The browser activity draws your line with each residual. | [Browser](https://codey-m.github.io/prob_stats/practice/regression/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module5_practice_regression.ipynb) |
| Practice: [A z-test in code](practice/module5_practice_ztest.ipynb) | Standardize an observed mean under the null hypothesis and convert it to a two-sided p-value. The browser activity shades the tails your statistic implies and compares them with the p-value you return. Without code, type the difference and standard error, then click the tails that count. | [Browser](https://codey-m.github.io/prob_stats/practice/ztest/) · [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/practice/module5_practice_ztest.ipynb) |
| Practice: [From row to residual](https://codey-m.github.io/prob_stats/practice/design_matrix/) | Build the design row [1, x, g, xg] for a model where two groups have their own intercepts and slopes, predict from supplied coefficients, and match each observation to its residual. Work one row by hand, then build the whole design matrix in NumPy, as Lab 5 asks. The browser activity plots the predictions your matrix makes, then shows what a mismatched residual subtraction returns. | [Browser](https://codey-m.github.io/prob_stats/practice/design_matrix/) |
| Practice: [Which rows set the scale?](https://codey-m.github.io/prob_stats/practice/preprocessing/) | Choose which rows fit a feature's mean and spread and how the holdout is scaled, then shift the holdout and check whether the training scale holds. Prepares Lab 5's training-only standardization; Python is optional. | [Browser](https://codey-m.github.io/prob_stats/practice/preprocessing/) |

## Final project

| Project | What you investigate | Run |
| --- | --- | --- |
| [Discovery of the Higgs boson](final_project/higgs_final_project.ipynb) | Work with real CMS four-lepton events from the 2012 search. Build a test statistic from a classifier, run a likelihood-ratio test with a floating background, calibrate p-values by simulation, and check goodness of fit, sensitivity to the background shape, and power. The [project guide](final_project/README.md) covers its files, data provenance and local setup. | [Colab](https://colab.research.google.com/github/codey-m/prob_stats/blob/main/final_project/higgs_final_project.ipynb) |

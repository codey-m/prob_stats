(() => {
'use strict';
const options=[['variance','Population variance'],['sd','Population standard deviation'],['se','Standard error of the mean']];
const r=(id,prompt,answer,short)=>({id,type:'radio',prompt,answer,short,options,retry:'Decide whether the question concerns individual draws, repeated sample means, or squared deviations.'});
const n=(id,prompt,answer,short)=>({id,type:'number',prompt,answer,short,label:'New value divided by old value',unit:'times',step:'scaling',retry:id.includes('sd')?'The population is unchanged. Recheck the spread of its individual values.':'For independent draws, the spread of sample means scales inversely with the square root of sample size.'});
window.reviewModel={title:'Spread and precision',intro:'A larger sample makes its mean more precise. Does it also make individual values less variable?',reviewTitle:'Try this first',freshTitle:'Increase the sample size again',
diagnostic:{intro:'Take repeated samples of n independent draws from a fixed population. X is measured in cm. A quantity may be used more than once.',questions:[
r('individual','Which quantity describes the spread of individual X values in cm?','sd','Spread of individual values'),
r('means','Which quantity describes the spread of sample means across repeated samples, in cm?','se','Spread of sample means'),
r('squared','Which quantity describes the mean squared deviation of individual values from the population mean, in cm²?','variance','Squared deviations'),
{id:'error',type:'radio',short:'Correct the report',prompt:'A report says: “Using four times as many draws halves the standard deviation of individual values.” What needs correcting?',options:[['mean','The halving applies to the spread of sample means.'],['variance','The halving applies to the population variance.'],['correct','The statement is correct for independent draws.']],answer:'mean',retry:'Compare what changes in the sampling procedure with what stays fixed in the population.'},
n('ratio-sd','Increase the sample size from n to 4n. What is the new population SD divided by the old population SD?',1,'Compare individual spread and mean precision'),
n('ratio-se','For the same change from n to 4n, what is the new standard error divided by the old standard error?',.5)
]},
fresh:{intro:'The population is unchanged. Each new sample contains 9n independent draws instead of n.',questions:[
r('fresh-means','Which quantity describes how the new sample means vary across repetitions?','se','Choose the mean-spread quantity'),
r('fresh-individual','Which quantity describes individual values in their original units?','sd','Choose the individual-spread quantity'),
n('fresh-sd','What is the new population standard deviation divided by the old population standard deviation?',1,'Compare both spreads at 9n'),
n('fresh-se','What is the new standard error divided by the old standard error?',1/3)
]},
hints:['Separate variation among individual draws from variation among whole-sample means.','Changing sample size changes the averaging procedure. The population distribution stays fixed.','For independent draws, the spread of sample means decreases with the square root of sample size.'],
explanation:['Changing n changes how many values go into each mean. It does not change the population distribution.','Population variance measures squared deviations of individual values. Population standard deviation measures their spread in the original units. Both stay fixed here.','Standard error describes variation among repeated sample means. For independent draws it is proportional to 1/√n. Multiplying n by 4 divides this spread by √4 = 2.','The report has applied that reduction to individual values. It belongs to the means.'],
freshExplanation:['Standard error describes spread among repeated means; standard deviation describes individual values in their original units.','The population is fixed, so its standard deviation has ratio 1. Each mean uses nine times as many independent draws, so its standard error has ratio 1/√9 = 1/3.']};
const correctReasons={"individual": "Standard deviation measures individual spread in the original units.", "means": "Standard error measures variation among repeated sample means.", "squared": "Variance averages squared deviations, so its units are cm².", "error": "Increasing sample size reduces the spread of means while the population stays fixed.", "ratio-sd": "The population is unchanged, so its standard deviation has ratio 1.", "ratio-se": "Four times as many independent draws gives a standard-error ratio of 1/√4 = 1/2.", "fresh-means": "The variation is among sample means, which standard error describes.", "fresh-individual": "Standard deviation describes individual values in their original units.", "fresh-sd": "Sampling more values leaves the population standard deviation unchanged.", "fresh-se": "Nine times as many independent draws gives a standard-error ratio of 1/√9 = 1/3."};
for(const stage of [window.reviewModel.diagnostic,window.reviewModel.fresh])for(const q of stage.questions){if(!correctReasons[q.id])throw Error("Missing correct-answer feedback: "+q.id);q.correct="Correct. "+correctReasons[q.id];}
window.reviewModel.visual={kind:'spread'};
})();

(()=>{const M=window.reviewModel;M.freshOptional=true;M.helpLabel="Show the method";M.intro="Move the sample-size control. Compare what happens to individual values and to sample means.";M.reminder="Population SD describes individual spread. Standard error describes spread among repeated sample means. For independent draws, SE = \u03c3/\u221an.";})();

(()=>{const M=window.reviewModel;M.opening={kind:'spread',intro:'Each curve describes a fixed normal population or the means of repeated independent samples from it. Change the number of draws in each sample.'};})();

window.reviewModel.opening.intro="";

/* Worked content is owned by individual questions, not an all-parts solution. */
(()=>{const M=window.reviewModel,worked={"individual": "Population standard deviation measures individual spread in the original units, here cm. Increasing the number of draws does not change this population quantity.", "means": "Standard error is the standard deviation of the mean across repeated samples of the same size. It describes variation between sample means, in cm.", "squared": "Population variance is the mean of (X − μ)². Squaring the deviations gives units cm².", "error": "The population remains fixed. Four times as many independent draws halves the spread of sample means, rather than changing the spread of individual values.", "ratio-sd": "The population distribution is unchanged, so the new population SD divided by the old SD is 1.", "ratio-se": "For independent draws, SE = σ/√n. The ratio is (σ/√(4n))/(σ/√n) = 1/2.", "fresh-sd": "The new sampling procedure leaves the population unchanged. The population-SD ratio is 1.", "fresh-se": "For a change from n to 9n independent draws, the standard-error ratio is (σ/√(9n))/(σ/√n) = 1/3."};for(const part of [M.diagnostic,M.fresh])for(const q of part.questions){q.worked=worked[q.id]||q.correct.replace(/^Correct\.\s*/, "");if(!q.worked)throw Error("Missing worked explanation: "+q.id);}})();

/* Opening demonstrates one move; subsequent questions require another. */
(()=>{const M=window.reviewModel;M.visual.samples=[2,3,5,7];M.visual.qualitative=true;M.opening.samples=[2,3,5,7];M.opening.qualitative=true;})();

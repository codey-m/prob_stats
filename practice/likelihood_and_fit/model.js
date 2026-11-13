(() => {
'use strict';
const f=x=>Number(x.toFixed(4)).toString();
function comparison(values,means,sd){
 if(sd<=0||values.length===0||values.some(x=>!Number.isFinite(x)))throw Error('Invalid observations or noise scale');
 const rss=means.map(mu=>values.reduce((sum,y)=>sum+(y-mu)**2,0));
 return {values,means,sd,rss,best:rss[0]<rss[1]?'A':'B',relative:rss.map(x=>(rss[0]-x)/(2*sd*sd))};
}
const A=comparison([1,2,5],[2,4],1),B=comparison([-1,0,2,3],[3,0],2);
const n=(id,prompt,answer,retry)=>({id,type:'number',prompt,answer,retry,label:'Sum of squared deviations',unit:'cm²'});
const r=(id,prompt,options,answer,retry)=>({id,type:'radio',prompt,options,answer,retry});
function data(c){return {caption:'Fixed observations: '+c.values.join(', ')+' cm. The independent observations are normal with a common unknown mean and known SD '+c.sd+' cm.',headers:['Candidate','Mean μ','Known SD'],rows:c.means.map((mu,i)=>[['A','B'][i],mu+' cm',c.sd+' cm'])};}
window.reviewModel={
 title:'Comparing likelihoods',intro:'A model fits the observed data better. What does that tell you about its parameter?',reviewTitle:'Try this first',freshTitle:'Compare different candidate means',
 diagnostic:{intro:'Compare possible means of a normal population using the observations below. No prior probabilities over the candidate means are supplied.',table:data(A),questions:[
 r('vary','To compare likelihoods for the observations already collected, what should vary?',[['data','The observations, while the candidate mean stays fixed.'],['parameter','The candidate mean, while the observations stay fixed.'],['prior','The prior probabilities, while the candidate mean stays fixed.']],'parameter','Compare how the same observed values fit different candidate means.'),
 n('squared','For candidate A, what is the sum of (observed value − candidate mean)²?',A.rss[0],'Subtract the candidate mean from each observation, square each difference, and add.'),
 r('fit','Which candidate assigns the higher likelihood to these same observations?',[['A','Candidate A'],['B','Candidate B'],['same','They assign the same likelihood']],'A','The observations are independent and normal, with the same known SD under both candidates. Compare their total squared deviations.'),
 {"id": "posterior", "type": "checkbox", "prompt": "No prior over the candidate means is supplied. Which conclusions are established?", "options": [["posterior", "The comparison establishes A as the more probable model, without any prior assumption."], ["fit", "A fits these observations better than B."], ["global", "A has the highest likelihood among all possible normal-population means."], ["equal-prior", "If these two models had equal prior probabilities, A would have higher posterior probability."]], "answer": ["fit", "equal-prior"], "misconceptions": {"posterior": "The likelihood comparison alone cannot establish a posterior ranking; prior probabilities also matter.", "global": "A is better than B, but the sample mean 8/3 cm gives a higher likelihood than A."}},
 r('constant','The same constant is added to both candidates’ log-likelihoods. What happens to their ranking?',[['reverse','The ranking reverses.'],['same','The ranking stays the same.'],['equal','The candidates become tied.']],'same','Adding the same constant preserves the difference between two scores.'),
 r('choices','Keep the observations and known SD fixed. Add more allowed candidate means while retaining A and B. Can the largest attainable likelihood decrease?',[['yes','Yes; the likelihood is divided among more candidates.'],['no','No; every previously available candidate is still available.'],['prior','It depends on how prior probability is redistributed.']],'no','The old candidates remain available. Likelihood is not a fixed probability total distributed among parameter choices.')
 ]},
 fresh:{intro:'Use these new observations and candidate means. The SD is again known and shared by both candidates. No prior over the means is supplied.',table:data(B),questions:[
 r('fresh-vary','Which comparison answers the fitting question for this new sample?',[['parameter','Compare candidate means using these same observed values.'],['data','Compare possible new samples using one fixed candidate mean.'],['posterior','Compare posterior probabilities without choosing a prior.']],'parameter','Keep the observed sample fixed while comparing candidate parameters.'),
 n('fresh-squared','For candidate B, what is the sum of (observed value − candidate mean)²?',B.rss[1],'Include every observation, with each deviation squared before summing.'),
 r('fresh-fit','Which candidate gives these observations the higher likelihood?',[['A','Candidate A'],['same','They give the same likelihood'],['B','Candidate B']],'B','The known SD is common to both candidates, so squared deviations decide their likelihood ranking.'),
 {"id": "fresh-probability", "type": "checkbox", "prompt": "No prior over these candidate means is supplied. Which conclusions follow from the new likelihood comparison?", "options": [["fit", "B fits these observations better than A."], ["posterior", "The comparison determines B’s posterior probability without a prior assumption."], ["equal-prior", "If these two models had equal prior probabilities, B would have higher posterior probability."], ["global", "B has the highest likelihood among all possible normal-population means."]], "answer": ["fit", "equal-prior"], "misconceptions": {"posterior": "Posterior probabilities require prior probabilities as well as the likelihood.", "global": "B is better than A, but the sample mean 1 cm gives a higher likelihood than B."}},
 r('fresh-constant','A term depending only on these observations is removed from every candidate’s log-likelihood. What happens to the maximizing candidate?',[['changes','It must change.'],['unknown','It cannot be determined without that term.'],['same','It stays the same.']],'same','A term constant across the candidate parameters does not affect their ranking.')
 ]},
 hints:['Separate the observed values from the candidate parameter. For inference from an observed sample, the values stay fixed.','For independent normal observations with a common known SD σ, log-likelihood is C − Σ(yᵢ − μ)²/(2σ²). C is the same for every candidate mean.','Likelihood values compare how candidates fit the observations. A prior is needed to turn them into posterior probabilities over candidates.'],
 explanation:[
 'The observed values are 1, 2, and 5 cm. They remain fixed while the candidate mean changes.',
 'For A, μ = 2: the squared deviations are 1, 0, and 9 cm², totaling 10 cm². For B, μ = 4: they are 9, 4, and 1 cm², totaling 14 cm².',
 'Independence makes the joint normal density a product. Taking logs gives C − Σ(yᵢ − μ)²/(2σ²). The SD is fixed at 1 cm, so A has the higher likelihood of the two candidates. The sample mean 8/3 cm has squared-deviation total 26/3 cm², lower than A’s 10 cm². A is therefore not the maximum over every possible mean.',
 'The likelihood evaluates the observed data under each mean. Posterior probabilities additionally use a prior over the candidate means. With equal prior probabilities on these two models, A also has the higher posterior probability. Dividing the two likelihoods by their sum is valid under that equal-prior assumption.',
 'Adding or removing a term common to all candidate log-likelihoods preserves their ranking. Adding allowed means also retains every old choice, so the best attainable likelihood cannot decrease.'
 ],
 freshExplanation:[
 'For B, μ = 0: squared deviations of −1, 0, 2, and 3 are 1, 0, 4, and 9 cm², totaling 14 cm². For A, μ = 3, they total 26 cm².',
 'The known SD is 2 cm under both candidates. The same positive factor multiplies both squared-deviation totals in the negative log-likelihood, so B has the higher likelihood.',
 'No prior was supplied, so this comparison does not determine a posterior probability for B. Equal prior probabilities on these two models would make B more probable than A after observation. B is not the unrestricted maximum: the sample mean 1 cm has squared-deviation total 10 cm², less than B’s 14 cm². Removing a term independent of the candidate mean leaves the maximizing candidate unchanged.'
 ],
 visual:{kind:'likelihood',values:A.values,means:A.means,sd:A.sd},
 glossary:[]
};
const titles={vary:'Keep the observations fixed',squared:'Squared deviations for A',fit:'Compare candidate fits',posterior:'Distinguish posterior probability',constant:'Shift every log-likelihood',choices:'Expand the allowed means','fresh-vary':'Compare the new candidates','fresh-squared':'Squared deviations for B','fresh-fit':'Compare the new fits','fresh-probability':'What the comparison establishes','fresh-constant':'Remove a common term'};
const reasons={
 vary:'The likelihood compares candidate parameters for the sample already observed.',
 squared:'For μ = 2, (1 − 2)² + (2 − 2)² + (5 − 2)² = 10 cm².',
 fit:'A has smaller total squared deviation, 10 versus 14 cm², with the same known normal noise scale.',
 posterior:'A has higher likelihood than B; equal prior probabilities give the same posterior ordering.',
 constant:'The difference between the two log-likelihoods is unchanged.',
 choices:'Retaining the old choices preserves the old maximum as an attainable value.',
 'fresh-vary':'The new sample stays fixed while the candidate mean changes.',
 'fresh-squared':'For μ = 0, (−1)² + 0² + 2² + 3² = 14 cm².',
 'fresh-fit':'B has squared-deviation total 14 cm², versus 26 cm² for A, with the same known SD.',
 'fresh-probability':'B has higher likelihood than A; equal prior probabilities give the same posterior ordering.',
 'fresh-constant':'A term independent of the candidate mean changes every score equally.'
};
for(const stage of [window.reviewModel.diagnostic,window.reviewModel.fresh])for(const q of stage.questions){q.short=titles[q.id];q.correct='Correct. '+reasons[q.id];}
})();

(()=>{const M=window.reviewModel;M.freshOptional=true;M.helpLabel="Show the method";M.intro="Move the candidate mean while the observations stay fixed. Then compare the fits.";M.reminder="Likelihood varies the candidate parameter while holding observations fixed. With common known normal SD, smaller total squared deviation gives higher likelihood; posterior probabilities also require a prior.";})();

(()=>{const M=window.reviewModel;M.opening={kind:'candidate',values:[1,2,5],min:0,max:6,initial:2,intro:'The marks are the observations 1, 2 and 5 cm. Move the candidate mean; the observed values stay where they are.'};})();

/* Worked content is owned by individual questions, not an all-parts solution. */
(()=>{const M=window.reviewModel,worked={"vary": "The observations 1, 2 and 5 cm are fixed. Likelihood evaluates how well different candidate means fit this same observed sample.", "squared": "For candidate A, μ = 2 cm. The squared deviations are (1 − 2)² = 1, (2 − 2)² = 0 and (5 − 2)² = 9. Their sum is 10 cm².", "fit": "The normal SD is known and common to both candidates, so log-likelihood is C − Σ(yᵢ − μ)²/(2σ²), with the same C and σ. A has squared-deviation total 10 cm²; B has (1 − 4)² + (2 − 4)² + (5 − 4)² = 14 cm². A has higher likelihood.", "posterior": "A fits these observations better than B. With equal prior probabilities on these two models, A would also have higher posterior probability. Without a prior assumption, that posterior conclusion is not established. Nor is A the unrestricted likelihood maximum: the sample mean 8/3 cm has squared-deviation total 26/3 cm², below A’s 10 cm².", "fresh-squared": "For candidate B, μ = 0 cm. The squared deviations total (−1)² + 0² + 2² + 3² = 1 + 0 + 4 + 9 = 14 cm².", "fresh-fit": "Both candidates use known SD 2 cm. B has total squared deviation 14 cm², while A has (−1 − 3)² + (0 − 3)² + (2 − 3)² + (3 − 3)² = 26 cm². B therefore has higher likelihood.", "fresh-probability": "B fits the observations better than A; equal priors on these two models would give B higher posterior probability. No prior was supplied, so a posterior probability is not determined. B is not the unrestricted maximum: mean 1 cm gives squared-deviation total 10 cm², below B’s 14 cm²."};for(const part of [M.diagnostic,M.fresh])for(const q of part.questions){q.worked=worked[q.id]||q.correct.replace(/^Correct\.\s*/, "");if(!q.worked)throw Error("Missing worked explanation: "+q.id);}})();

/* Opening demonstrates one move; subsequent questions require another. */
(()=>{const M=window.reviewModel;
 M.diagnostic.questions=M.diagnostic.questions.filter(q=>q.id!=='vary');
 M.diagnostic.intro='The fixed observations are 1, 2 and 5 cm. Candidate A has mean 2 cm; candidate B has mean 4 cm. Both assume independent normal observations with known SD 1 cm. No prior over the means is supplied.';
 M.opening.intro='Move the candidate mean. The segments show deviations of the fixed observations 1, 2 and 5 cm from that mean.';
})();

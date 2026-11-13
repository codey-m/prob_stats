(() => {
'use strict';
function choose(n,k){if(!Number.isInteger(n)||!Number.isInteger(k)||k<0||k>n)throw Error('Invalid count');let c=1;for(let i=1;i<=k;i++)c=c*(n-k+i)/i;return c;}
function trials(n,k,p){if(!(p>0&&p<1))throw Error('Invalid success probability');const ways=choose(n,k),one=p**k*(1-p)**(n-k);let orders=1;for(let i=2;i<=k;i++)orders*=i;return {n,k,p,ways,one,total:ways*one,ordered:ways*orders};}
const A=trials(5,2,1/5),B=trials(8,5,1/2);
if(A.ways!==10||A.ordered!==20||B.ways!==56||B.ways!==choose(8,3))throw Error('Unexpected case counts');
const n=(id,prompt,answer,retry,label)=>({id,type:'number',prompt,answer,retry,label});
const r=(id,prompt,options,answer,retry)=>({id,type:'radio',prompt,options,answer,retry});
window.reviewModel={
 freshOptional:true,helpLabel:'Show the method',reminder:'For exactly k successes in n independent trials, choose which k positions succeed: n!/(k!(n − k)!) ways, ignoring order. Each such sequence has probability pᵏ(1 − p)ⁿ⁻ᵏ, so multiply the count by that probability.',
 opening:{kind:'slots',trials:5,p:[1,5],intro:'Each trial succeeds with probability 1/5, independently of the others. Mark which of the 5 trials succeed and read that sequence’s probability. Try more than one way to place exactly 2 successes.'},
 title:'Counting successes',intro:'Mark which trials succeed, then count the sequences that give exactly that many successes.',reviewTitle:'Try this first',freshTitle:'Try more trials',
 diagnostic:{intro:'Each trial succeeds with probability 1/5, independently of the other trials. Run 5 trials. Find the probability of exactly 2 successes.',questions:[
 n('ways','How many sequences of 5 results have successes in exactly 2 positions?',A.ways,'Choose which 2 of the 5 positions hold the successes. Picking position 2 and then 4 gives the same sequence as 4 and then 2.','Number of sequences'),
 n('total','What is the probability of exactly 2 successes in the 5 trials?',A.total,'Each sequence you counted has probability (1/5)² × (4/5)³, whichever positions hold the successes. The sequences are disjoint, so their probabilities add.','Probability'),
 r('error','A report counts 5 × 4 = 20 ways: five places for a first success, then four for a second. What needs correcting?',[['fine','Nothing; 20 is the number of sequences with exactly 2 successes.'],['replace','The second success could also go in the first position, giving 5 × 5.'],['order','Each pair of positions was counted twice, once in each order.']],'order','Compare the picks (2, 4) and (4, 2). Do they describe different sequences?'),
 {"id": "change", "type": "checkbox", "prompt": "Keep 5 trials and exactly 2 successes, but change the success probability from 1/5 to 1/2. Which statements are correct?", "options": [["count", "The number of sequences with exactly 2 successes is still 10."], ["single", "Each of those sequences keeps probability (1/5)² × (4/5)³."], ["equal", "Those 10 sequences still all have the same probability."], ["total", "The probability of exactly 2 successes stays 128/625."]], "answer": ["count", "equal"], "misconceptions": {"single": "A sequence’s probability is a product of success and failure probabilities, so it changes when they do.", "total": "The count stays the same, but each sequence’s probability changes, so their sum changes too."}}
 ]},
 fresh:{intro:'Now each trial succeeds with probability 1/2, independently. Run 8 trials. Find the probability of exactly 5 successes.',questions:[
 r('fresh-count','Which count gives the number of sequences with exactly 5 successes in 8 trials?',[['ordered','8 × 7 × 6 × 5 × 4, ordered picks of the 5 success positions'],['all','2⁸, the number of all sequences of 8 results'],['failures','The number of ways to choose the 3 failure positions']],'failures','Fixing which positions fail also fixes which succeed.'),
 n('fresh-ways','How many sequences of 8 results have exactly 5 successes?',B.ways,'Choose the 3 failure positions from 8, ignoring order: (8 × 7 × 6)/(3 × 2 × 1).','Number of sequences'),
 n('fresh-total','What is the probability of exactly 5 successes in the 8 trials?',B.total,'With success probability 1/2, every sequence of 8 results has probability (1/2)⁸. Multiply by the number of sequences you counted.','Probability'),
 {"id": "fresh-change", "type": "checkbox", "prompt": "Keep 8 trials and exactly 5 successes, but change the success probability to 0.3. Which statements are correct?", "options": [["count-p", "The count changes, because successes are now less likely."], ["same-count", "There are still 56 sequences with exactly 5 successes."], ["uniform", "Every sequence of 8 results is still equally likely."], ["one", "Each sequence with exactly 5 successes has probability 0.3⁵ × 0.7³."]], "answer": ["same-count", "one"], "misconceptions": {"count-p": "The count depends only on the numbers of trials and successes, not on the success probability.", "uniform": "With success probability 0.3, a sequence with more successes is less likely than one with fewer."}}
 ]},
 hints:['Describe the event as sequences of results. The successes may occupy any of the positions, not only the first ones.','The number of ways to choose k positions from n, ignoring order, is n!/(k!(n − k)!). Picking positions one at a time counts each set k! times, once for each order.','Independence makes each sequence’s probability a product: p for each success and 1 − p for each failure. Sequences with the same number of successes share that probability, so multiply it by the count.'],
 explanation:[
 'The event “exactly 2 successes in 5 trials” contains every sequence of 5 results with successes in exactly 2 positions. Which 2 positions is not fixed.',
 'Choosing 2 of 5 positions in order gives 5 × 4 = 20 picks. Each pair of positions is picked twice, once in each order, so there are 20/2 = 10 sequences. In factorials, 5!/(2! 3!) = 10.',
 'By independence, the sequence success, success, failure, failure, failure has probability (1/5)² × (4/5)³ = 64/3125. Any other arrangement multiplies the same five factors in a different order, so all 10 sequences have this probability.',
 'The sequences are disjoint, so their probabilities add: 10 × 64/3125 = 128/625 ≈ 0.2048.',
 'Changing the success probability changes each sequence’s probability, and so the total. The number of sequences depends only on the numbers of trials and successes.'
 ],
 freshExplanation:[
 'Choosing the 5 success positions among 8 also fixes the 3 failure positions, so the count is 8!/(5! 3!) = (8 × 7 × 6)/(3 × 2 × 1) = 56.',
 'With success probability 1/2, every sequence of 8 results has probability (1/2)⁸ = 1/256. Exactly 5 successes therefore has probability 56/256 = 7/32 ≈ 0.219.',
 'With success probability 0.3 the count is still 56, and each such sequence has probability 0.3⁵ × 0.7³. Sequences with different numbers of successes are no longer equally likely.'
 ],
 visual:{kind:'binomial',trials:5,successes:2,revealAfter:'ways',probabilitiesAfter:'total',sequenceProbability:'64/3125',total:'128/625'},
 glossary:[]
};
const titles={event:'Describe the event',ways:'Count the sequences',one:'One sequence’s probability',total:'Exactly 2 successes',error:'Correct the count',change:'Change the success probability','fresh-count':'Choose the count','fresh-ways':'Count the new sequences','fresh-total':'Exactly 5 successes','fresh-change':'Change the success probability'};
const reasons={
 event:'The 2 successes may occupy any 2 of the 5 positions.',
 ways:'Choosing 2 of 5 positions, ignoring order, gives 5!/(2! 3!) = 10 sequences.',
 one:'Independence multiplies 1/5 for each success and 4/5 for each failure, giving 64/3125.',
 total:'Ten disjoint sequences, each with probability 64/3125, give 128/625 ≈ 0.2048.',
 error:'The ordered picks (2, 4) and (4, 2) give the same sequence, so 20 counts each set twice.',
 change:'The count depends on the numbers of trials and successes; each sequence’s probability depends on p, and they still share it.',
 'fresh-count':'Fixing the 3 failure positions fixes the 5 success positions, so the counts agree.',
 'fresh-ways':'8!/(5! 3!) = (8 × 7 × 6)/(3 × 2 × 1) = 56.',
 'fresh-total':'56 sequences, each with probability (1/2)⁸ = 1/256, give 56/256 = 7/32.',
 'fresh-change':'The count is still 56, and each such sequence has probability 0.3⁵ × 0.7³.'
};
const worked={
 ways:'Choosing 2 of 5 positions in order gives 5 × 4 = 20 picks. Each pair of positions is picked twice, once in each order, so there are 20/2 = 10 sequences. In factorials, 5!/(2! 3!) = 10.',
 total:'Each of the 10 sequences has probability (1/5)² × (4/5)³ = 64/3125, whichever positions hold the successes. They are disjoint, so exactly 2 successes has probability 10 × 64/3125 = 128/625 ≈ 0.2048.',
 error:'The ordered picks (2, 4) and (4, 2) describe the same sequence. Counting 5 × 4 = 20 counts every set of 2 positions twice, so divide by 2 to get 10.',
 change:'The count depends only on the numbers of trials and successes, so it stays 10. With success probability 1/2, each of those sequences has probability (1/2)⁵ = 1/32: they still share one probability, but it is no longer 64/3125, and the total becomes 10/32 = 5/16.',
 'fresh-count':'Choosing which 5 of the 8 trials succeed also fixes the 3 that fail, so the count equals the number of ways to choose the 3 failure positions.',
 'fresh-ways':'8!/(5! 3!) = (8 × 7 × 6)/(3 × 2 × 1) = 56.',
 'fresh-total':'With success probability 1/2, every sequence of 8 results has probability (1/2)⁸ = 1/256. Exactly 5 successes has probability 56/256 = 7/32 ≈ 0.219.',
 'fresh-change':'The count is still 56. Each such sequence has probability 0.3⁵ × 0.7³, and sequences with different numbers of successes are no longer equally likely.'
};
for(const stage of [window.reviewModel.diagnostic,window.reviewModel.fresh])for(const q of stage.questions){if(!reasons[q.id]||!titles[q.id]||!worked[q.id])throw Error('Missing feedback: '+q.id);q.short=titles[q.id];q.correct='Correct. '+reasons[q.id];q.worked=worked[q.id];}
})();

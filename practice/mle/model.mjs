export const cases=[
 {id:'original',name:'Five waiting times',data:[2,4,4,5,5],handTheta:.25},
 {id:'longer',name:'Every waiting time doubled',data:[4,8,8,10,10],handTheta:.125},
 {id:'shorter',name:'Every waiting time halved',data:[1,2,2,2.5,2.5],handTheta:.5},
 {id:'repeated',name:'Twice as many, same empirical distribution',data:[2,4,4,5,5,2,4,4,5,5],handTheta:.25},
 {id:'zero',name:'Includes a zero waiting time',data:[0,1,2,3],handTheta:.5},
];
export const starter=`import math

def loglik(theta, data):
    """Return exponential log-likelihood, using a rate theta."""
    raise NotImplementedError("Complete loglik")

def mle(data):
    """Return the rate that maximizes the log-likelihood."""
    raise NotImplementedError("Complete mle")
`;
export function segments(points){const groups=[];let group=[];for(const p of points){if(p[1]===null){if(group.length)groups.push(group);group=[];}else group.push(p);}if(group.length)groups.push(group);return groups;}
export function indent(text,start,end){const beginning=text.lastIndexOf('\n',start-1)+1;if(start===end)return {text:text.slice(0,start)+'    '+text.slice(end),start:start+4,end:start+4};const block=text.slice(beginning,end),out=block.split('\n').map(line=>'    '+line).join('\n');return {text:text.slice(0,beginning)+out+text.slice(end),start:start+4,end:end+out.length-block.length};}

// Case chips name the transformation each preset applies to the base sample.
const CHIPS={original:['Original','Five waiting times'],longer:['Every time ×2','Every waiting time doubled'],shorter:['Every time ÷2','Every waiting time halved'],repeated:['Each value twice','Twice as many, same distribution'],zero:['Includes a 0','Includes a zero waiting time']};
for(const c of cases){[c.chip,c.chipLabel]=CHIPS[c.id];}
// One rule vocabulary for the hand route and for describing Python output. ℓ always sums its terms.
export const contributionRules={
 log:{label:'log θ − θx',one:(t,x)=>Math.log(t)-t*x},
 density:{label:'θe^(−θx)',one:(t,x)=>t*Math.exp(-t*x)},
 scale:{label:'−log θ − x/θ',one:(t,x)=>-Math.log(t)-x/t}
};
export const estimateRules={rate:{label:'n / Σx',estimate:d=>d.length/d.reduce((s,x)=>s+x,0)},scale:{label:'Σx / n',estimate:d=>d.reduce((s,x)=>s+x,0)/d.length}};
export const baseRate=d=>d.length/d.reduce((s,x)=>s+x,0);
export const grid=(lo,hi)=>Array.from({length:121},(_,i)=>lo+(hi-lo)*i/120);
// Same grid as the runner: 121 rates from 0.1 to 2.5 times n/Σx, unless a shared comparison grid is given.
export function recipeResult(data,contribution='log',estimate='rate',thetas=null){
 const one=contributionRules[contribution].one,total=t=>data.reduce((s,x)=>s+one(t,x),0),b=baseRate(data),e=estimate?estimateRules[estimate].estimate(data):null;
 return {points:(thetas||grid(.1*b,2.5*b)).map(t=>[t,total(t)]),estimate:e,estimate_value:e===null?null:total(e),neighbors:e===null?[[null,null],[null,null]]:[.8,1.2].map(f=>[e*f,total(e*f)]),rules:[contribution,estimate],issues:[...(contribution!=='log'?['The terms differ from the rate model’s log densities.']:[]),...(estimate&&estimate!=='rate'?['Σx / n has units of time; θ is a rate.']:[])],suite:[],error:null,stdout:''};
}
export function recipeValues(c,rules){const r=recipeResult(c.data,...rules);return {points:r.points,estimate:r.estimate,estimate_value:r.estimate_value,neighbors:r.neighbors};}
export function matchingRecipes(data,result){
 const close=(a,b)=>a!==null&&b!==null&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(a),Math.abs(b)),out=[];
 for(const a of Object.keys(contributionRules))for(const e of Object.keys(estimateRules)){const r=recipeResult(data,a,e);if(close(r.estimate,result.estimate)&&r.points.every((p,i)=>close(p[1],result.points[i]?.[1])))out.push(`Σ(${contributionRules[a].label}), θ̂ = ${estimateRules[e].label}`);}
 return out;
}
// Hand entry: one observation's term of ℓ at a stated rate, named by the rule it matches.
export const hand={value:(c,rule)=>contributionRules[rule].one(c.handTheta,c.data[0])};
export function classifyEntry(c,value){return Object.keys(contributionRules).find(k=>{const r=hand.value(c,k);return Math.abs(value-r)<=Math.max(.005,.005*Math.abs(r));})||null;}
export function parseEntry(text){const t=String(text).trim().replace(/^[−–]/,'-');if(!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t))return null;const v=Number(t);return Number.isFinite(v)?v:null;}
export const TERM_MSG={density:'That is f itself; ℓ adds log densities.',scale:'That is the scale model (mean θ); here θ is a rate.',none:'Not a term of ℓ at this θ.'};

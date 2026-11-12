export const cases=[{"id": "original", "name": "Separated training and holdout values", "train": [2, 4, 6, 8], "holdout": [10, 12, 14]}, {"id": "holdout_shift", "name": "Only the holdout moves", "train": [2, 4, 6, 8], "holdout": [20, 22, 24]}, {"id": "train_shift", "name": "Only the training values move", "train": [7, 9, 11, 13], "holdout": [10, 12, 14]}, {"id": "unequal", "name": "Unequal partition sizes", "train": [1, 2, 4, 5, 8], "holdout": [3, 9]}];
export const starter=`import math

def standardize(train, holdout):
    """Return (mean, spread, train_scaled, holdout_scaled).

    Lists contain one feature. Use population spread (ddof=0).
    Keep the supplied lists unchanged.
    """
    raise NotImplementedError("Complete standardize")
`;
export const fitRules={train:{label:'Training rows',rows:c=>c.train},all:{label:'Training + holdout rows',rows:c=>[...c.train,...c.holdout]},holdout:{label:'Holdout rows',rows:c=>c.holdout}};
export const applyRules={reuse:{label:'Reuse the fitted parameters'},refit:{label:'Refit on holdout'}};
export function stats(rows){const mean=rows.reduce((s,x)=>s+x,0)/rows.length;return {mean,spread:Math.sqrt(rows.reduce((s,x)=>s+(x-mean)**2,0)/rows.length)};}
export function recipe(c,fit='train',apply='reuse'){
 const s=stats(fitRules[fit].rows(c)),h=apply==='refit'?stats(c.holdout):s;
 return {values:{...s,train:c.train.map(x=>(x-s.mean)/s.spread),holdout:c.holdout.map(x=>(x-h.mean)/h.spread)},issues:[...(fit!=='train'?['The fitted parameters use '+fitRules[fit].label.toLowerCase()+'.']:[]),...(apply!=='reuse'?['The holdout is transformed with separately fitted parameters.']:[])],error:null,stdout:'',suite:[]};
}
const same=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
export function matchingRecipes(c,v){const out=[];for(const f of Object.keys(fitRules))for(const a of Object.keys(applyRules)){const r=recipe(c,f,a).values;if(same(v.mean,r.mean)&&same(v.spread,r.spread)&&v.train.every((x,i)=>same(x,r.train[i]))&&v.holdout.every((x,i)=>same(x,r.holdout[i])))out.push(`${fitRules[f].label} → ${applyRules[a].label}`);}return out;}
export const fmt=x=>Number(x.toPrecision(5)).toString();
// Case chips name what each preset moves relative to the base case.
const CHIPS={original:['base','Separated training and holdout'],holdout_shift:['holdout →','Only the holdout moves'],train_shift:['training →','Only the training values move'],unequal:['unequal n','Unequal partition sizes']};
for(const c of cases){[c.chip,c.chipLabel]=CHIPS[c.id];}
export const recipeValues=(c,[f,a])=>recipe(c,f,a).values;
// Fit chips select partitions; the rule key follows from which are on.
export const fitKey=(train,holdout)=>train&&holdout?'all':train?'train':holdout?'holdout':null;
export const FIT_MSG={all:'Holdout rows leak into μ and s.',holdout:'The model learns from the training rows.'};
export const APPLY_MSG={refit:'Refitting hides how the holdout differs.'};

// The hand route moves between these two; other datasets are exercised by the Python case suite.
export const handCases=['original','holdout_shift'];

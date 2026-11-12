import {cases,estimateRules,recipeResult,baseRate,grid,classifyEntry,parseEntry,TERM_MSG} from './model.mjs';
const $=id=>document.getElementById(id),num=x=>Number(Number(x).toPrecision(4)).toString();
// Hand-route state: chosen formula, last hand result per case, and whether the view shows the hand route.
let estimate=null,active=false,select=null,applyHand=null;const memory=new Map();
const STEPS=['term','peak','est','second'];
function marks(state={}){
 for(const k of STEPS){const v=state[k],m=$('mark-'+k);if(!m)continue;m.textContent=v===true?'✓':v===false?'✗':'';m.className='mark '+(v===true?'ok':v===false?'bad':'');m.setAttribute('aria-label',v===true?'done':v===false?'needs work':'');}
 const box=$('progress');box.replaceChildren();if(STEPS.every(k=>state[k]===true)){const s=document.createElement('span');s.className='done';s.textContent='Complete: the peak and n / Σx agree on two datasets.';box.append(s);}
}
// Formula options show their value on the current data, so the choice can be checked against the peak.
function options(){
 const c=select?.();if(!c)return;const n=c.data.length,sum=c.data.reduce((a,b)=>a+b,0),box=$('est-options');box.replaceChildren();
 for(const [k,r] of Object.entries(estimateRules)){
  const label=document.createElement('label');label.className='option';const input=document.createElement('input');input.type='radio';input.name='estimate';input.value=k;input.checked=estimate===k;input.onchange=()=>{estimate=k;update();};
  const f=document.createElement('span');f.className='formula';f.textContent='θ = '+r.label;const val=document.createElement('span');val.className='value';val.textContent=k==='rate'?`= ${n} / ${sum} = ${num(n/sum)}`:`= ${sum} / ${n} = ${num(sum/n)}`;label.append(input,f,val);box.append(label);}
}
function prompt(){const c=select?.();if(!c)return;$('term-prompt').textContent=`At θ = ${c.handTheta}, x₁ = ${c.data[0]} adds:`;$('term-entry').setAttribute('aria-label',`What x1 = ${c.data[0]} adds to the log-likelihood at theta = ${c.handTheta}`);options();}
function sync(){for(const b of $('case-chips').children)b.setAttribute('aria-pressed',String(b.dataset.case===$('case').value));}
function update(){
 const c=select(),value=parseEntry($('term-entry').value),rule=value===null?null:classifyEntry(c,value);sync();
 if(!rule){if(active){active=false;applyHand(null);}resetProgress();if(value!==null){$('term-entry').classList.add('wrong');$('term-msg').textContent=TERM_MSG.none;marks({term:false});}return;}
 const prior=[...memory.values()].filter(m=>m.case.id!==c.id).at(-1);let r;
 if(prior){
  // Both curves on one shared rate grid so the previous dataset can be drawn faded behind this one.
  const bs=[baseRate(c.data),baseRate(prior.case.data)],thetas=grid(.1*Math.min(...bs),2.5*Math.max(...bs));
  r=recipeResult(c.data,rule,estimate,thetas);const p=recipeResult(prior.case.data,...prior.rules,thetas);r.previous={case:prior.case,points:p.points,estimate:p.estimate,estimate_value:p.estimate_value};
 }else r=recipeResult(c.data,rule,estimate);
 r.anchored={term:rule==='log'?null:TERM_MSG[rule],est:estimate===null||estimate==='rate'?null:'Σx / n is a mean waiting time, so it has units of time; θ is a rate.'};
 if(estimate){memory.delete(c.id);memory.set(c.id,{case:c,rules:[rule,estimate],ok:rule==='log'&&estimate==='rate'});}
 active=true;applyHand(r);
}
export function installReasoning({selected,apply,clear}){
 select=selected;applyHand=r=>r?apply(r):clear();
 for(const c of cases){const b=document.createElement('button');b.type='button';b.className='case-chip';b.dataset.case=c.id;b.textContent=c.chip;b.setAttribute('aria-label',c.chipLabel);b.onclick=()=>{$('case').value=c.id;$('case').dispatchEvent(new Event('change'));};$('case-chips').append(b);}
 $('case').addEventListener('change',()=>{prompt();sync();if(active)update();});
 $('term-entry').addEventListener('input',update);prompt();sync();resetProgress();
}
export function resetProgress(){
 prompt();if(!$('term-msg'))return;$('term-msg').textContent='';$('est-msg').textContent='';$('term-entry').classList.remove('wrong','right');
 $('peak-msg').textContent='The curve appears below once step 1 is right.';marks();
}
export function describe(c,result,mode,index){
 $('results').dataset.mode=mode;
 if(mode!=='choices'){active=false;marks();const done=mode==='student'&&result.suite.length&&result.suite.every(r=>r.passed);$('progress').replaceChildren();const s=document.createElement('span');s.className=done?'done':'small';s.textContent=done?'Complete: your Python passed every case.':'Python result shown. The steps above complete too.';$('progress').append(s);return;}
 active=true;const a=result.anchored||{};
 $('term-entry').classList.toggle('wrong',!!a.term);$('term-entry').classList.toggle('right',!a.term);$('term-msg').textContent=a.term||'';$('est-msg').textContent=a.est||'';
 for(const o of $('est-options').querySelectorAll('.option'))o.classList.toggle('wrong',o.querySelector('input').checked&&!!a.est);
 // The peak is judged on the curve being shown: the candidate must sit within one grid step of its maximum.
 const valid=result.points.map((p,i)=>[p[1],i]).filter(p=>p[0]!==null),top=valid.reduce((m,p)=>p[0]>m[0]?p:m,[-Infinity,-1])[1],atPeak=Math.abs(index-top)<=1;
 $('peak-msg').textContent=atPeak?'○ is at the top of your curve.':'Drag ○ (or use the arrow keys) until it is at the top.';
 const ok=!a.term&&estimate==='rate',second=ok&&atPeak&&[...memory.values()].some(m=>m.ok&&m.case.id!==c.id);
 marks({term:!a.term,peak:atPeak?true:undefined,est:estimate===null?undefined:estimate==='rate',second:second?true:undefined});
}

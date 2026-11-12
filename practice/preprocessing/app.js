import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
import {cases,starter,fitRules,applyRules,recipe,matchingRecipes,fmt,FIT_MSG,APPLY_MSG} from './model.mjs';
const $=id=>document.getElementById(id);
let result=null,mode='',busy=false,version=0,runId=0,row=null,last=null,previous=null;
// Hand-route choices: which partitions fit μ and s, and how the holdout is scaled.
let fitRule=null,applyRule=null;
const selected=()=>cases.find(c=>c.id===$('case').value),fit=()=>fitRule;
const signature=()=>mode==='choices'?`choices:${fit()}:${applyRule}`:mode==='reference'?'reference':'student:'+window.pythonEditor.getValue();
for(const c of cases){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;$('case').append(o);}
$('editor').value=starter;
const status=({message})=>{$('status').textContent=message;},student=new PythonExecutor({onStatus:status}),reference=new PythonExecutor({role:'reference',onStatus:status});
function lock(value){busy=value;for(const id of ['run','reference','test'])$(id).disabled=value;$('stop').disabled=!value;}
function element(tag,parent,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;}
function chipRow(state={}){const box=$('progress');box.replaceChildren();
 // Step headings carry the ✓ / ✗; the status line only announces completion.
 for(const k of ['fit','apply','shift']){const v=state[k],m=$('mark-'+k);m.textContent=v===true?'✓':v===false?'✗':'';m.className='mark '+(v===true?'ok':v===false?'bad':'');m.setAttribute('aria-label',v===true?'done':v===false?'needs work':'');}
 if(['fit','apply','shift'].every(k=>state[k]===true))element('span',box,'Complete: the training scale held when new data arrived.','done');}
function syncControls(){for(const r of document.querySelectorAll('input[name=fit]'))r.checked=r.value===fitRule;for(const r of document.querySelectorAll('input[name=apply]'))r.checked=r.value===applyRule;const shifted=$('case').value==='holdout_shift';$('shift').setAttribute('aria-pressed',String(shifted));$('shift').textContent=shifted?'← Undo the shift':'Shift the holdout →';}
function invalidate(editor=false){version++;if(busy&&(!editor||mode==='student')){const ex=mode==='reference'?reference:student;if(!ex.isLoading)ex.cancel();lock(false);}if(editor&&mode!=='student')return;result=null;$('results').hidden=true;$('empty').hidden=false;$('error').hidden=true;$('output').hidden=true;$('fit-msg').textContent='';$('apply-msg').textContent='';chipRow();syncControls();}
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<=1e-9*Math.max(1,Math.abs(x)));
function inspect(){if(!result||!row)return;const [part,i]=row.split(':'),c=selected(),v=result.values;$('reading').textContent=`${part==='train'?'Training':'Holdout'} row ${+i+1}: ${fmt(c[part][i])} → ${fmt(v[part][i])}`;for(const b of $('scene').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.row===row));}
// Each line has training circles above the axis and holdout squares below it.
function rail(kind,c,v,prior){
 const arrays=kind==='input'?c:v,old=prior?(kind==='input'?prior.case:prior.values):null,band=kind==='input'&&v.spread>0?[v.mean-v.spread,v.mean+v.spread]:[];
 const values=[...arrays.train,...arrays.holdout,...band,...(old?[...old.train,...old.holdout]:[]),kind==='input'?v.mean:0],mag=Math.max(1,...values.map(Math.abs)),lo0=Math.min(...values)/mag,hi0=Math.max(...values)/mag,pad=Math.max((hi0-lo0)*.06,.05),lo=lo0-pad,hi=hi0+pad,pos=x=>(x/mag-lo)/(hi-lo)*100;
 element('h3',$('scene'),kind==='input'?'Original feature':'Scaled feature','rail-title');
 const r=element('div',$('scene'),undefined,'rail two-lane');r.setAttribute('role','group');r.setAttribute('aria-label',kind==='input'?'Original values':'Scaled values');
 element('span',r,fmt(lo*mag),'tick start');element('span',r,fmt(hi*mag),'tick end');
 if(kind==='input'){if(band.length){const b=element('span',r,undefined,'spread-band');b.style.left=pos(band[0])+'%';b.style.width=(pos(band[1])-pos(band[0]))+'%';b.setAttribute('aria-hidden','true');}const m=element('span',r,'μ','fit-mean');m.style.left=pos(v.mean)+'%';m.setAttribute('aria-hidden','true');}
 else{const z=element('span',r,'0','zero');z.style.left=pos(0)+'%';z.setAttribute('aria-hidden','true');}
 for(const part of ['train','holdout'])arrays[part].forEach((x,i)=>{
  const from=old&&old[part].length===arrays[part].length?old[part][i]:null,moved=from!==null&&Math.abs(from-x)>1e-9*Math.max(1,Math.abs(x));
  if(moved){const g=element('span',r,String(i+1),'ghost '+part);g.style.left=pos(from)+'%';g.setAttribute('aria-hidden','true');const t=element('span',r,undefined,'trail '+part+(kind==='scaled'&&part==='train'?' alarm':''));t.style.left=Math.min(pos(from),pos(x))+'%';t.style.width=Math.abs(pos(x)-pos(from))+'%';t.setAttribute('aria-hidden','true');}
  const b=element('button',r,String(i+1),part);b.type='button';b.dataset.row=`${part}:${i}`;b.setAttribute('aria-label',`${part==='train'?'Training':'Holdout'} row ${i+1}, ${kind==='input'?'original':'scaled'} ${fmt(x)}`);b.onclick=()=>{row=b.dataset.row;inspect();};
  // Points slide from their previous-case position; reduced motion skips the transition in CSS.
  if(moved){b.style.left=pos(from)+'%';requestAnimationFrame(()=>requestAnimationFrame(()=>{b.style.left=pos(x)+'%';}));}else b.style.left=pos(x)+'%';
 });
}
function verdict(c,v,prior){
 // Judged only when the training rows are identical across the two cases, so only the holdout moved.
 if(!prior||!same(prior.case.train,c.train)||same(prior.case.holdout,c.holdout))return null;
 return {train:same(prior.values.train,v.train),holdout:!same(prior.values.holdout,v.holdout)};
}
function draw(){
 if(!result)return;const c=selected(),v=result.values,scene=$('scene');scene.replaceChildren();
 const prior=previous&&previous.signature===signature()&&previous.caseId!==c.id?previous:null;
 $('parameters').textContent=`μ = ${fmt(v.mean)} · s = ${fmt(v.spread)}`+(mode==='choices'&&applyRule==='refit'?' · holdout refit':'');
 rail('input',c,v,prior);rail('scaled',c,v,prior);
 const judged=verdict(c,v,prior);
 if(prior){const box=element('p',scene,undefined,'comparison');element('span',box,prior.case.id==='original'?'After the shift:':`Compared with ${prior.case.chipLabel.toLowerCase()}:`,'small');
  if(judged){element('span',box,judged.train?'✓ training points stayed put':'✗ training points moved','chip '+(judged.train?'ok':'bad'));element('span',box,judged.holdout?'✓ the shift shows in the holdout':'✗ the shift is hidden','chip '+(judged.holdout?'ok':'bad'));}
  else element('span',box,'faded markers show the previous dataset','small');}
 if(row&&![...scene.querySelectorAll('button')].some(b=>b.dataset.row===row))row=null;$('reading').textContent='';inspect();
 $('feedback').textContent=mode==='choices'?'':result.issues.length?result.issues.join(' '):'The fitted parameters and both transformations match the training-only check.';
 const matches=mode==='choices'?[]:matchingRecipes(c,v);$('recipe-description').textContent=mode==='choices'?'':(matches.length?'Matches: '+matches.join(' or '):'Matches none of the listed recipes')+' · describes output, not a code trace';
 $('suite-panel').hidden=!result.suite.length;$('suite').replaceChildren(...result.suite.map(r=>{const s=document.createElement('span');s.className='chip '+(r.passed?'ok':'bad');s.textContent=`${r.passed?'✓':'✗'} ${r.name}: ${r.passed?'passed':r.issues.join(' ')}`;return s;}));
 if(mode==='choices'){
  const k=fit();$('fit-msg').textContent=FIT_MSG[k]||'';$('apply-msg').textContent=APPLY_MSG[applyRule]||'';
  const right=k==='train'&&applyRule==='reuse';
  chipRow({fit:k==='train',apply:applyRule==='reuse',shift:right&&judged&&judged.train&&judged.holdout?true:undefined});
 }else{$('progress').replaceChildren();const done=mode==='student'&&result.suite.length&&result.suite.every(r=>r.passed);element('span',$('progress'),done?'Complete: your Python passed every case.':'Python result shown. The hand route above completes too.',done?'done':'small');}
}
function show(response,nextMode){result=response;mode=nextMode;if(!result.values)return;last={signature:signature(),caseId:selected().id,case:selected(),values:result.values};$('view-title').textContent=mode==='reference'?'Reference':mode==='choices'?'Your scaling':'Your code';$('results').hidden=false;$('empty').hidden=true;draw();}
function applyHand(){syncControls();const k=fit();if(!k||!applyRule){invalidate();$('fit-msg').textContent='';chipRow({fit:k?k==='train':undefined,apply:applyRule?applyRule==='reuse':undefined});return;}invalidate();show(recipe(selected(),k,applyRule),'choices');}
async function run(nextMode,suite=false){if(busy)return;invalidate();mode=nextMode;const stamp=version,id=++runId,code=window.pythonEditor.getValue(),caseId=selected().id;lock(true);try{const response=await(mode==='reference'?reference:student).run({mode,caseId,suite,...(mode==='student'?{code}:{})},{isCurrent:()=>stamp===version&&id===runId});if(stamp!==version||id!==runId)return;$('stdout').textContent=response.stdout;$('output').hidden=!response.stdout;if(response.error){$('error').textContent=response.error;$('error').hidden=false;}show(response,mode);}catch(e){if(stamp===version&&id===runId&&!e.superseded){$('error').textContent=e.message;$('error').hidden=false;}}finally{if(stamp===version&&id===runId)lock(false);}}
$('run').onclick=()=>run('student');$('reference').onclick=()=>run('reference');$('test').onclick=()=>run('student',true);$('stop').onclick=()=>{++runId;(mode==='reference'?reference:student).cancel();lock(false);};
$('case').onchange=()=>{previous=last;syncControls();const wasHand=mode==='choices'&&result;row=null;invalidate();if(wasHand)applyHand();};
for(const r of document.querySelectorAll('input[name=fit]'))r.onchange=()=>{fitRule=r.value;applyHand();};for(const r of document.querySelectorAll('input[name=apply]'))r.onchange=()=>{applyRule=r.value;applyHand();};
$('shift').onclick=()=>{$('case').value=$('case').value==='holdout_shift'?'original':'holdout_shift';$('case').dispatchEvent(new Event('change'));};
$('reset').onclick=()=>window.pythonEditor.setValue(starter,{user:true});$('download').onclick=()=>{const blob=new Blob([window.pythonEditor.getValue()],{type:'text/x-python'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='standardize.py';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.pythonEditor=createEditor({textarea:$('editor'),gutter:$('line-numbers'),manage:true,enhance:!new URLSearchParams(location.search).has('plain_editor'),onChange:()=>{if(mode==='student')invalidate(true);},onRun:()=>run('student')});window.addEventListener('pagehide',()=>{student.dispose();reference.dispose();});invalidate();

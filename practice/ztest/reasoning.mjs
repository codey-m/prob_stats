import {cases,handResult,parseEntry,matchingRecipes,fmt} from './model.mjs';
const $=id=>document.getElementById(id);
// Hand-route state: counted tails, last hand result per case, and whether the view shows the hand route.
let tails=[],active=false,select=null,applyHand=null;const memory=new Map();
const STEPS=[['z','1'],['tails','2'],['second','3']];
// Step headings carry ✓ / ✗; the status line only announces completion.
function chips(state={}){const box=$('progress');box.replaceChildren();
 for(const [k] of STEPS){const v=state[k],m=$('mark-'+k);if(!m)continue;m.textContent=v===true?'✓':v===false?'✗':'';m.className='mark '+(v===true?'ok':v===false?'bad':'');m.setAttribute('aria-label',v===true?'done':v===false?'needs work':'');}
 if(STEPS.every(([k])=>state[k]===true)){const s=document.createElement('span');s.className='done';s.textContent='Complete: same gap, more data, smaller p.';box.append(s);}
}
function syncCaseChips(){for(const b of $('case-chips').children)b.setAttribute('aria-pressed',String(b.dataset.case===$('case').value));}
function update(){
 const c=select(),d=parseEntry($('diff-entry').value),s=parseEntry($('se-entry').value);
 if(d===null||s===null||s===0){if(active){active=false;applyHand(null);}resetProgress();return;}
 const r=handResult(c,d,s,tails),others=[...memory.values()].filter(m=>m.case.id!==c.id);
 const prior=others.at(-1);if(prior)r.values.previous={case:prior.case,values:prior.values};
 memory.delete(c.id);memory.set(c.id,{case:c,values:r.values,ok:!r.issues.length});
 active=true;applyHand(r);
}
export function installReasoning({selected,apply,clear}){
 select=selected;applyHand=r=>r?apply(r):clear();
 for(const c of cases){const b=document.createElement('button');b.type='button';b.className='case-chip';b.dataset.case=c.id;b.textContent=c.chip;b.title=c.chipLabel;b.setAttribute('aria-label',c.chipLabel);b.onclick=()=>{$('case').value=c.id;$('case').dispatchEvent(new Event('change'));};$('case-chips').append(b);}
 // The shell's own change handler clears first; this one then re-applies the hand route with the same entries.
 $('case').addEventListener('change',()=>{syncCaseChips();if(active)update();});syncCaseChips();
 for(const id of ['diff-entry','se-entry'])$(id).addEventListener('input',update);
 const toggle=key=>{tails=tails.includes(key)?tails.filter(t=>t!==key):[...tails,key];update();};
 $('scene').addEventListener('click',e=>{const t=e.target.closest?.('[data-tail]');if(t)toggle(t.dataset.tail);});
 $('scene').addEventListener('keydown',e=>{const t=e.target.closest?.('[data-tail]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(t.dataset.tail);}});
 resetProgress();
}
export function resetProgress(){
 if($('z-out'))$('z-out').textContent='';for(const id of ['diff-msg','se-msg','tails-msg'])if($(id))$(id).textContent='';
 for(const id of ['diff-entry','se-entry'])$(id)?.classList.remove('wrong','right');
 chips();
}
export function describeTest(c,result,mode){
 const v=result.values,box=$('standardization');box.replaceChildren();$('results').dataset.mode=mode;
 if(mode==='choices'){
  active=true;const a=result.anchored;$('z-out').textContent='= '+fmt(v.z);
  for(const [k,id] of [['diff','diff-entry'],['se','se-entry']]){$(id).classList.toggle('wrong',!!a[k]);$(id).classList.toggle('right',!a[k]);$(k+'-msg').textContent=a[k]||'';}
  $('tails-msg').textContent=a.tails||'';
  const ok=!result.issues.length,second=ok&&[...memory.values()].some(m=>m.ok&&m.case.id!==c.id);
  chips({z:!a.diff&&!a.se,tails:a.tails?(v.tails.length?false:undefined):true,second:second?true:undefined});
  $('recipe-description').textContent='';
  return;
 }
 active=false;
 // Python output: show what the returned z implies, never the expected SE.
 const d=c.xbar-c.mu0,implied=Number.isFinite(v.z)&&v.z!==0?d/v.z:null;
 const p=document.createElement('p');p.className='small';p.textContent=implied===null?'':`Your z implies a denominator of ${fmt(implied)} (Δ ÷ z).`;box.append(p);
 const matches=matchingRecipes(c,v);$('recipe-description').textContent=matches.length?'Matches: '+matches.join(' or ')+' · describes output, not a code trace':'';
 const done=mode==='student'&&result.suite.length&&result.suite.every(r=>r.passed);
 $('progress').replaceChildren();const s=document.createElement('span');s.className=done?'done':'small';s.textContent=done?'Complete: your Python passed every case.':'Python result shown. The steps above complete too.';chips();$('progress').append(s);
}

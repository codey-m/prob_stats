import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
import {cases,starter,density,domain,precisionShare,indent} from './model.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=x=>Math.abs(x)>=10000||(x!==0&&Math.abs(x)<.001)?Number(x).toExponential(3):Number(x).toFixed(3).replace(/\.?0+$/,'');
let result=null,current=null,index=0,reversed=false,busy=false,mode='',revision=0,runId=0,timer=null;
$('editor').value=starter;
for(const c of cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('case').append(option);}
function selected(){const c=cases.find(c=>c.id===$('case').value);return {...c,observations:reversed?[...c.observations].reverse():[...c.observations]};}
function pause(){clearInterval(timer);timer=null;$('play').textContent='Replay';}
function clear(){pause();result=null;$('results').hidden=true;$('empty').hidden=false;$('error').hidden=true;$('output').hidden=true;const c=selected();$('inputs').textContent=`Prior: mean ${c.mean}, variance ${c.variance}. Observation variance: ${c.noise}. Observations: ${c.observations.join(', ')}.`;$('reverse').textContent=reversed?'Restore observation order':'Reverse observation order';}
function invalidate(){
 revision++;
 if(busy){const executor=mode==='reference'?reference:student;if(!executor.isLoading)executor.cancel();lock(false);}
 clear();
}
function lock(value){busy=value;for(const id of ['run','reference','test'])$(id).disabled=value;$('stop').disabled=!value;}
const status=({message})=>{$('status').textContent=message;};
const student=new PythonExecutor({onStatus:status}),reference=new PythonExecutor({onStatus:status,role:'reference'});
function lines(){const editor=$('editor');$('line-numbers').textContent=editor.value.split('\n').map((_,i)=>i+1).join('\n');$('line-numbers').scrollTop=editor.scrollTop;}
function node(tag,attrs={},content){const element=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))element.setAttribute(k,v);if(content!==undefined)element.textContent=content;$('drawing').append(element);return element;}
const close=(a,b)=>a.every((x,i)=>Math.abs(x-b[i])<=1e-10+1e-8*Math.abs(b[i]));
function points(mean,variance,lo,hi){const xs=Array.from({length:241},(_,i)=>lo+(hi-lo)*i/240);for(let i=-40;i<=40;i++){const x=mean+Math.sqrt(variance)*i/10;if(x>=lo&&x<=hi)xs.push(x);}return xs.sort((a,b)=>a-b).map(x=>[x,density(x,mean,variance)]);}
function draw(){
 if(!result?.steps.length)return;
 const step=result.steps[index],c=current,[lo,hi]=domain(c),posterior=step.posterior;
 $('observations').replaceChildren();c.observations.forEach((value,i)=>{const button=document.createElement('button');button.className='secondary';button.textContent=`${i+1}: ${value}`;button.disabled=i>=result.steps.length;button.setAttribute('aria-pressed',String(i===index));button.onclick=()=>{pause();index=i;draw();};$('observations').append(button);});
 $('step-label').textContent=`Observation ${index+1} of ${c.observations.length}: ${step.observation}. ${index?'The preceding returned posterior is the incoming prior.':'The initial distribution is the incoming prior.'}`;
 const curves=[{params:step.prior,color:'#526775',dash:'8 5'},{params:[step.observation,c.noise],color:'#9a3d08',dash:'2 5'},{params:posterior,color:'#145c68',dash:''}];
 if($('batch-toggle').checked&&result.batch)curves.push({params:result.batch,color:'#743884',dash:'8 3 2 3'});
 // Fixed scales across the full trajectory, using actual returned curves only.
 const allParams=[[c.mean,c.variance],...c.observations.map(x=>[x,c.noise]),...result.steps.map(s=>s.posterior),...(result.batch?[result.batch]:[])];
 const peak=Math.max(...allParams.flatMap(p=>points(...p,lo,hi).map(p=>p[1])),1e-300)*1.08;
 const width=Math.max(270,$('plot').getBoundingClientRect().width),left=48,right=width-16,top=25,bottom=225;
 $('plot').setAttribute('viewBox',`0 0 ${width} 280`);$('drawing').replaceChildren();
 const x=v=>left+(v-lo)/(hi-lo)*(right-left),y=v=>bottom-v/peak*(bottom-top);
 node('text',{x:left,y:16},'Density');
 for(const value of [0,peak/2,peak]){node('line',{x1:left,x2:right,y1:y(value),y2:y(value),stroke:'#d0d9df'});node('text',{x:left-5,y:y(value)+5,'text-anchor':'end'},fmt(value));}
 for(const curve of curves){const d=points(...curve.params,lo,hi).map(([a,b],i)=>`${i?'L':'M'}${x(a).toFixed(2)},${y(b).toFixed(2)}`).join(' ');node('path',{d,stroke:curve.color,'stroke-width':2.5,'stroke-dasharray':curve.dash,fill:'none'});}
 for(let i=0;i<=4;i++){const value=lo+(hi-lo)*i/4;node('text',{x:x(value),y:248,'text-anchor':'middle'},fmt(value));}node('text',{x:(left+right)/2,y:274,'text-anchor':'middle'},'Unknown mean θ');
 const outside=posterior[0]<lo||posterior[0]>hi;
 $('parameters').textContent=`Returned posterior: mean ${fmt(posterior[0])}, variance ${fmt(posterior[1])}.${outside?' Its mean is outside the plotted range.':''}`;
 const share=precisionShare(step.prior[1],c.noise);
 $('weights').textContent=`Incoming prior precision: ${fmt(1/step.prior[1])}. Observation precision: ${fmt(1/c.noise)}. Observation share of total precision: ${fmt(100*share)}%.`;
 $('prior-share').style.flexGrow=String(1-share);$('data-share').style.flexGrow=String(share);$('data-share').parentElement?.setAttribute('aria-label',`Prior ${fmt(100*(1-share))}%, observation ${fmt(100*share)}% of total precision`);
 $('feedback').textContent=close(posterior,step.expected)?'This posterior matches the independent check.':'This returned posterior differs from the independent check.';
 $('previous').disabled=index===0;$('next').disabled=index===result.steps.length-1;
 $('batch-toggle').disabled=!result.batch;
 $('batch').textContent=result.batch?`Sequential result after ${result.steps.length} observations: mean ${fmt(result.steps.at(-1).posterior[0])}, variance ${fmt(result.steps.at(-1).posterior[1])}. Batch call: original prior with observation mean ${fmt(c.observations.reduce((a,b)=>a+b,0)/c.observations.length)} and variance ${fmt(c.noise/c.observations.length)}. Returned batch: mean ${fmt(result.batch[0])}, variance ${fmt(result.batch[1])}. Dash-dot purple shows the batch curve when selected.`:'The batch comparison is unavailable because a function call failed.';
 $('batch-feedback').textContent=result.batch?`${result.agreement?'Sequential and batch agree.':'Sequential and batch differ.'} ${result.correct?'Both match the independent checks.':'At least one returned update differs from the independent checks.'}`:'';
 $('text-curves').textContent=`Incoming prior: mean ${fmt(step.prior[0])}, variance ${fmt(step.prior[1])}. Observation likelihood as a function of θ: centered at ${step.observation}, variance ${c.noise}. ${$('parameters').textContent} ${$('feedback').textContent}`;
 $('plot-description').textContent=`${$('text-curves').textContent} Dashed prior, dotted observation likelihood, solid returned posterior. Plot range ${fmt(lo)} to ${fmt(hi)}, fixed through this run. ${$('batch-toggle').checked?$('batch').textContent:''}`;
 $('suite-panel').hidden=!result.suite?.length;
 $('suite').textContent=result.suite?.length?result.suite.map(row=>`${row.name}: ${row.passed?'passed':row.error||'differs from independent check'}`).join(' '):'';
}
async function run(nextMode,suite=false){
 if(busy)return;clear();lock(true);mode=nextMode;const id=++runId,version=revision,c=selected(),code=$('editor').value;
 try{
  const response=await(mode==='reference'?reference:student).run({mode,case:c,code:mode==='reference'?undefined:code,suite},{isCurrent:()=>id===runId&&version===revision});
  if(id!==runId)return;if(version!==revision){$('status').textContent='Inputs changed. Python stays ready; rerun for the current inputs.';return;}
  $('stdout').textContent=response.stdout;$('output').hidden=!response.stdout;
  if(response.error){$('error').textContent=response.error;$('error').hidden=false;}
  if(response.steps?.length){result=response;current=c;index=0;$('results').hidden=false;$('empty').hidden=true;$('view-title').textContent=mode==='reference'?'Reference updating':'Updating from your code';draw();}
 }catch(error){if(id===runId&&version===revision){$('error').textContent=error.message;$('error').hidden=false;}}
 finally{if(id===runId&&version===revision)lock(false);}
}
$('run').onclick=()=>run('student');$('reference').onclick=()=>run('reference');$('test').onclick=()=>run('student',true);
$('stop').onclick=()=>{++runId;(mode==='reference'?reference:student).cancel();lock(false);};
$('case').onchange=()=>{invalidate();};$('reverse').onclick=()=>{reversed=!reversed;invalidate();};
$('previous').onclick=()=>{pause();if(index>0)index--;draw();};$('next').onclick=()=>{pause();if(index<result.steps.length-1)index++;draw();};$('batch-toggle').onchange=draw;
$('play').onclick=()=>{if(timer){pause();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){index=result.steps.length-1;draw();return;}index=0;draw();$('play').textContent='Pause';timer=setInterval(()=>{if(index>=result.steps.length-1){pause();return;}index++;draw();},1000);};
$('editor').addEventListener('input',()=>{lines();if(mode!=='reference')invalidate();});$('editor').addEventListener('scroll',lines);
let escapeTab=false;$('editor').addEventListener('keydown',event=>{if(event.key==='Escape'){escapeTab=true;return;}if(event.key==='Tab'&&!event.shiftKey&&!escapeTab){event.preventDefault();const e=$('editor'),change=indent(e.value,e.selectionStart,e.selectionEnd);e.value=change.text;e.setSelectionRange(change.start,change.end);e.dispatchEvent(new Event('input'));}else if(event.key!=='Shift')escapeTab=false;if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run('student');}});$('editor').addEventListener('blur',()=>{escapeTab=false;});
window.addEventListener('resize',()=>{if(result)draw();});window.addEventListener('pagehide',()=>{pause();student.dispose('Page closed');reference.dispose('Page closed');});lines();clear();
// Shared CodeMirror editor (../_shared/editor.mjs). The textarea keeps working as before; its value now proxies the editor.
window.pythonEditor=createEditor({textarea:$('editor'),gutter:$('line-numbers'),manage:false,enhance:!new URLSearchParams(location.search).has('plain_editor')});

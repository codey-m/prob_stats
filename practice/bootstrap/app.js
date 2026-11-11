import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
import {cases,starter,histogram,sd,valueGroups,nextStep,indentSelection} from './model.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=x=>Number(x).toFixed(2).replace(/\.00$/,'');
let result=null,mode='',busy=false,step={frame:1,picks:0,phase:'select'},timer=null,runId=0,revision=0,signature='';
const comparisons=new Map();
$('editor').value=starter;
for(const item of cases){const option=document.createElement('option');option.textContent=item.name;option.value=item.id;$('case').append(option);}
const selected=()=>cases.find(c=>c.id===$('case').value);
function status({message}){$('status').textContent=message;}
const student=new PythonExecutor({onStatus:status}),reference=new PythonExecutor({onStatus:status,role:'reference'});
function pause(){clearInterval(timer);timer=null;$('play').textContent='Replay';}
function clear(){pause();result=null;$('results').hidden=true;$('empty').hidden=false;$('error').hidden=true;$('output').hidden=true;$('original').textContent=`Original observations: ${selected().data.join(', ')} (n = ${selected().data.length}).`;}
function invalidate(){
 revision++;
 if(busy){const executor=mode==='reference'?reference:student;if(!executor.isLoading)executor.cancel();lock(false);}
 clear();
}
function lock(value){busy=value;for(const id of ['run','reference','test'])$(id).disabled=value;$('stop').disabled=!value;}
function lines(){const editor=$('editor');$('line-numbers').textContent=editor.value.split('\n').map((_,i)=>i+1).join('\n');$('line-numbers').scrollTop=editor.scrollTop;}
function node(tag,attrs={},content){const el=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(content!==undefined)el.textContent=content;$('drawing').append(el);return el;}
function token(parent,text,{active=false,empty=false,count=0}={}){const span=document.createElement('span');span.className=`token${active?' active':''}${empty?' empty':''}`;span.textContent=text;if(count>1){const detail=document.createElement('small');detail.textContent=`${count} observations`;span.append(detail);}parent.append(span);}
function draw(){
 if(!result)return;
 const data=selected().data,sample=result.samples[step.frame-1],mean=result.means[step.frame-1],shown=step.phase==='bin'?step.frame:step.frame-1,means=result.means.slice(0,shown);
 const last=step.picks?sample[step.picks-1]:null;
 $('source-values').replaceChildren();for(const group of valueGroups(data))token($('source-values'),group.value,{active:last===group.value&&step.phase==='select',count:group.count});
 $('source-note').textContent=selected().id==='ten'?'Each value occurs twice: the same empirical distribution as the five-observation case. Each source observation stays available after selection.':'Each source observation stays available after selection.';
 $('sample-title').textContent=`Resample ${step.frame}: ${step.picks} of ${sample.length} selections`;
 $('sample-values').replaceChildren();sample.forEach((value,i)=>token($('sample-values'),i<step.picks?value:'·',{active:i===step.picks-1&&step.phase==='select',empty:i>=step.picks}));
 const repeats=last===null?0:sample.slice(0,step.picks).filter(x=>x===last).length;
 $('selection-note').textContent=step.phase==='select'?(last===null?'Next step reveals the first returned selection.':`Selection ${step.picks} returned ${last}.${repeats>1?` Value ${last} has appeared ${repeats} times in this resample.`:''} It remains available in the source.`):'The selected values above are the values returned by the function.';
 $('equation').textContent=step.phase==='select'?'Complete the selections to calculate their mean.':`(${sample.join(' + ')}) / ${sample.length} = ${fmt(mean)}`;
 $('histogram-title').textContent=`Distribution of ${shown} resample means`;
 $('contribution').textContent=step.phase==='mean'?`Next step adds this mean, ${fmt(mean)}, to its histogram bin.`:step.phase==='bin'?`Mean ${fmt(mean)} contributes one count to the marked bin.`:'The current resample has not contributed a mean yet.';
 const lo=Math.min(...data)-Math.max((Math.max(...data)-Math.min(...data))*.1,1),hi=Math.max(...data)+Math.max((Math.max(...data)-Math.min(...data))*.1,1);
 const other=selected().id==='five'?'ten':selected().id==='ten'?'five':null,comparison=other?comparisons.get(signature+'|'+other):null;
 const width=Math.max(270,$('plot').getBoundingClientRect().width),left=42,right=width-15,bottom=208,top=30,chart=right-left;
 $('plot').setAttribute('viewBox',`0 0 ${width} 260`);$('drawing').replaceChildren();
 const counts=histogram(means,lo,hi),full=histogram(result.means,lo,hi),previous=comparison?histogram(comparison.means,lo,hi):null;
 const peak=Math.max(...full,...(previous||[]),1),ceiling=Math.ceil(peak/5)*5,x=v=>left+(v-lo)/(hi-lo)*chart,bw=chart/counts.length;
 for(const count of [0,ceiling/2,ceiling]){const y=bottom-(count/ceiling)*(bottom-top);node('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#d0d9df'});node('text',{x:left-5,y:y+5,'text-anchor':'end'},fmt(count));}
 node('text',{x:left,y:16},'Count');
 const current=Math.min(counts.length-1,Math.floor((mean-lo)/(hi-lo)*counts.length));
 counts.forEach((count,i)=>{const height=count/ceiling*(bottom-top);node('rect',{x:left+i*bw+1,y:bottom-height,width:Math.max(1,bw-2),height,fill:'#145c68'});});
 if(comparison&&shown===result.means.length)previous.forEach((count,i)=>{const height=count/ceiling*(bottom-top);node('rect',{x:left+i*bw+1,y:bottom-height,width:Math.max(1,bw-2),height,fill:'none',stroke:'#526775','stroke-dasharray':'4 2','stroke-width':2});});
 if(step.phase==='bin'){const cx=x(mean),landing=bottom-counts[current]/ceiling*(bottom-top);const arrival=node('circle',{cx,cy:landing,r:5,fill:'#9a3d08',class:'mean-arrival'});arrival.style.setProperty('--travel',`${top-landing}px`);node('line',{x1:cx,x2:cx,y1:top,y2:bottom,stroke:'#9a3d08','stroke-dasharray':'5 4','stroke-width':2});node('text',{x:left+(current+.5)*bw,y:Math.max(top+14,bottom-counts[current]/ceiling*(bottom-top)-6),'text-anchor':'middle',fill:'#9a3d08'},'+1');}
 for(let i=0;i<=4;i++){const value=lo+i*(hi-lo)/4;node('text',{x:x(value),y:231,'text-anchor':'middle'},fmt(value));}node('text',{x:(left+right)/2,y:255,'text-anchor':'middle'},'Resample mean');
 $('spread').textContent=`Spread of observations: ${fmt(sd(data))}. Bootstrap SE: ${shown>1?fmt(sd(means)):'needs at least two completed resamples'}.`;
 $('comparison').textContent=comparison?(shown===result.means.length?`Solid bars: n = ${data.length}, SE ${fmt(sd(means))}. Dashed bars: n = ${comparison.n}, SE ${fmt(sd(comparison.means))}. Same empirical distribution, seed and number of resamples.`:'Show all means to compare with your completed run at the other sample size.'):other?'Run n = 5 and n = 10 with the same code, seed and resample count, then Show all means to compare their distributions.':'';
 $('position').textContent=`${step.frame} of ${result.means.length}`;$('progress').value=step.frame;
 $('reading').textContent=`${mode==='reference'?'Reference':'Your code'} · ${step.picks} selections · ${shown} means accumulated.`;
 $('text-sample').textContent=`Selected values so far: ${sample.slice(0,step.picks).join(', ')||'none'}.${step.phase!=='select'?` Their mean is ${fmt(mean)}.`:''}`;
 $('text-distribution').textContent=counts.map((n,i)=>`${fmt(lo+i*(hi-lo)/counts.length)} to ${fmt(lo+(i+1)*(hi-lo)/counts.length)}: ${n}`).join('; ');
 $('plot-description').textContent=`${shown} resample means. Count scale 0 to ${ceiling}, fixed across this run. ${$('contribution').textContent} ${$('spread').textContent} ${$('comparison').textContent} Histogram interval counts are available as text below.`;
}
function advance(){const next=nextStep(step,result.samples[step.frame-1].length,result.means.length);const finished=next===step;step=next;draw();return finished;}
async function run(nextMode,suite=false){
 if(busy)return;clear();lock(true);mode=nextMode;const id=++runId,version=revision,code=$('editor').value,data=selected().data,caseId=selected().id,seed=Number($('seed').value),count=Number($('count').value);
 signature=JSON.stringify([mode,mode==='student'?code:'reference',seed,count]);
 try{
  const response=await(mode==='reference'?reference:student).run({mode,code:mode==='reference'?undefined:code,data,seed,count,suite},{isCurrent:()=>id===runId&&version===revision});
  if(id!==runId)return;
  if(version!==revision){$('status').textContent='Inputs changed. Python stays ready; run again for the current inputs.';return;}
  $('stdout').textContent=response.stdout;$('output').hidden=!response.stdout;if(response.error)throw new Error(response.error);
  result=response;comparisons.set(signature+'|'+caseId,{means:result.means,n:data.length});if(comparisons.size>8)comparisons.delete(comparisons.keys().next().value);step={frame:1,picks:0,phase:'select'};
  $('progress').max=result.means.length;$('results').hidden=false;$('empty').hidden=true;
  $('view-title').textContent=mode==='reference'?'Reference resampling':'Resampling from your code';
  $('feedback').textContent=response.checks?(response.issues.length?response.issues.join(' '):'The disclosed checks passed on four datasets, using seeds 17 and 91 with 40 draws per seed.'):'Test other cases checks sample size, membership, repeat selections on distinct-valued inputs, reproducibility, and use of the supplied generator.';
  draw();
 }catch(error){if(id===runId&&version===revision){$('error').textContent=error.message;$('error').hidden=false;}}
 finally{if(id===runId&&version===revision)lock(false);}
}
$('run').onclick=()=>run('student');$('reference').onclick=()=>run('reference');$('test').onclick=()=>run('student',true);
$('stop').onclick=()=>{++runId;(mode==='reference'?reference:student).cancel();lock(false);};
for(const id of ['case','count','seed'])$(id).addEventListener('change',()=>{invalidate();});
$('editor').addEventListener('input',()=>{lines();if(mode!=='reference')invalidate();});
$('editor').addEventListener('scroll',lines);
let escapeTab=false;
$('editor').addEventListener('keydown',event=>{
 if(event.key==='Escape'){escapeTab=true;return;}
 if(event.key==='Tab'&&!event.shiftKey&&!escapeTab){event.preventDefault();const editor=$('editor'),change=indentSelection(editor.value,editor.selectionStart,editor.selectionEnd);editor.value=change.text;editor.setSelectionRange(change.start,change.end);editor.dispatchEvent(new Event('input'));}
 else if(event.key!=='Shift')escapeTab=false;
 if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run('student');}
});
$('editor').addEventListener('blur',()=>{escapeTab=false;});
$('progress').oninput=()=>{pause();const frame=Number($('progress').value);step={frame,picks:result.samples[frame-1].length,phase:'bin'};draw();};
$('step').onclick=()=>{pause();advance();};
$('all').onclick=()=>{pause();step={frame:result.means.length,picks:result.samples.at(-1).length,phase:'bin'};draw();};
$('play').onclick=()=>{if(timer){pause();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){step={frame:result.means.length,picks:result.samples.at(-1).length,phase:'bin'};draw();return;}step={frame:1,picks:0,phase:'select'};draw();$('play').textContent='Pause';timer=setInterval(()=>{if(advance())pause();},350);};
window.addEventListener('resize',()=>{if(result)draw();});
window.addEventListener('pagehide',()=>{pause();student.dispose('Page closed');reference.dispose('Page closed');});
lines();clear();
// Shared CodeMirror editor (../_shared/editor.mjs). The textarea keeps working as before; its value now proxies the editor.
window.pythonEditor=createEditor({textarea:$('editor'),gutter:$('line-numbers'),manage:false,enhance:!new URLSearchParams(location.search).has('plain_editor')});

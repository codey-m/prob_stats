import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
import {cases,starter,segments,indent} from './model.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=x=>Math.abs(x)>=10000||(x!==0&&Math.abs(x)<.001)?Number(x).toExponential(3):Number(x).toFixed(4).replace(/\.?0+$/,'');
let result=null,mode='',busy=false,revision=0,runId=0,inspected=null;
$('editor').value=starter;
for(const c of cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('case').append(option);}
const selected=()=>cases.find(c=>c.id===$('case').value);
function clear(){result=null;$('results').hidden=true;$('empty').hidden=false;$('error').hidden=true;$('output').hidden=true;const c=selected();$('inputs').textContent=`Waiting times: ${c.data.join(', ')}. n = ${c.data.length}, total waiting time = ${c.data.reduce((a,b)=>a+b,0)}. Rate units are inverse time.`;}
function invalidate(){
 revision++;
 if(busy){const executor=mode==='reference'?reference:student;if(!executor.isLoading)executor.cancel();lock(false);}
 clear();
}
function lock(value){busy=value;for(const id of ['run','reference','test'])$(id).disabled=value;$('stop').disabled=!value;}
const status=({message})=>{$('status').textContent=message;};
const student=new PythonExecutor({onStatus:status}),reference=new PythonExecutor({onStatus:status,role:'reference'});
function lines(){const e=$('editor');$('line-numbers').textContent=e.value.split('\n').map((_,i)=>i+1).join('\n');$('line-numbers').scrollTop=e.scrollTop;}
function node(tag,attrs={},content){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(content!==undefined)e.textContent=content;$('drawing').append(e);return e;}
function draw(){
 if(!result)return;
 const points=result.points,[lo]=points[0],[hi]=points.at(-1),valid=points.filter(p=>p[1]!==null);
 const scores=[...valid.map(p=>p[1]),...(result.estimate_value===null||result.estimate<lo||result.estimate>hi?[]:[result.estimate_value]),...result.neighbors.filter(p=>p[1]!==null&&p[0]>=lo&&p[0]<=hi).map(p=>p[1])];
 const scale=Math.max(1,...scores.map(Math.abs)),min=Math.min(...scores.map(v=>v/scale)),max=Math.max(...scores.map(v=>v/scale)),pad=(max-min||.1)*.08;
 const width=Math.max(270,$('plot').getBoundingClientRect().width),left=65,right=width-16,top=26,bottom=240;
 const x=v=>left+(v-lo)/(hi-lo)*(right-left),y=v=>bottom-((v/scale-min+pad)/(max-min+2*pad))*(bottom-top);
 $('plot').setAttribute('viewBox',`0 0 ${width} 300`);$('drawing').replaceChildren();node('text',{x:left,y:15},'Log-likelihood');
 for(let i=0;i<=3;i++){const score=(min+(max-min)*i/3)*scale;node('line',{x1:left,x2:right,y1:y(score),y2:y(score),stroke:'#d0d9df'});node('text',{x:left-5,y:y(score)+4,'text-anchor':'end'},fmt(score));}
 for(const group of segments(points))node('path',{d:group.map(([a,b],i)=>`${i?'L':'M'}${x(a).toFixed(2)},${y(b).toFixed(2)}`).join(' '),stroke:'#145c68','stroke-width':2.5,fill:'none'});
 const inView=theta=>theta>=lo&&theta<=hi;
 if(result.estimate!==null&&inView(result.estimate)){
  const cx=x(result.estimate);node('line',{x1:cx,x2:cx,y1:top,y2:bottom,stroke:'#9a3d08','stroke-width':2,'stroke-dasharray':'6 4'});
  if(result.estimate_value!==null){const cy=y(result.estimate_value);node('path',{d:`M ${cx} ${cy-6} L ${cx+6} ${cy} L ${cx} ${cy+6} L ${cx-6} ${cy} Z`,fill:'#9a3d08'});}
 }
 if(inspected&&inspected[1]!==null&&inView(inspected[0]))node('circle',{cx:x(inspected[0]),cy:y(inspected[1]),r:6,fill:'white',stroke:'#743884','stroke-width':3});
 for(let i=0;i<=4;i++){const theta=lo+(hi-lo)*i/4;node('text',{x:x(theta),y:265,'text-anchor':'middle'},fmt(theta));}node('text',{x:(left+right)/2,y:292,'text-anchor':'middle'},'Rate θ (inverse time)');
 $('estimate').textContent=result.estimate===null?'The estimate call did not return a valid positive rate.':`Returned estimate θ̂ = ${fmt(result.estimate)}.${result.estimate_value===null?' Its log-likelihood call failed.':` Returned log-likelihood = ${fmt(result.estimate_value)}.`}${inView(result.estimate)?'':' Estimate is outside the plotted rate range.'}`;
 $('candidate-value').textContent=!inspected?'Choose a candidate.':`Candidate θ = ${fmt(inspected[0])}: ${inspected[1]===null?'the likelihood call failed.':`returned log-likelihood ${fmt(inspected[1])}.`}${inView(inspected[0])?'':' Candidate is outside the plotted rate range.'}`;
 $('inspect-estimate').disabled=result.estimate_value===null;$('left').disabled=result.neighbors[0][1]===null;$('right').disabled=result.neighbors[1][1]===null;
 const better=result.estimate_value===null?[]:result.neighbors.filter(p=>p[1]!==null&&p[1]>result.estimate_value+1e-10);
 $('comparison').textContent=result.estimate_value===null?'':better.length?'At least one inspected neighboring rate has a larger returned log-likelihood than the estimate.':result.neighbors.every(p=>p[1]!==null)?'Neither inspected neighboring rate has a larger returned log-likelihood than the estimate.':'At least one neighboring likelihood call failed; inspect the curve and error output.';
 $('feedback').textContent=result.issues.length?result.issues.join(' '):'The likelihood values, rate estimate and positive-domain checks match the independent checks.';
 $('text-curve').textContent=points.map(([a,b])=>`θ ${fmt(a)}: ${b===null?'call failed':fmt(b)}`).join('; ');
 $('suite-panel').hidden=!result.suite.length;$('suite').textContent=result.suite.map(row=>`${row.name}: ${row.passed?'passed':row.issues.join(' ')}`).join(' ');
 $('plot-description').textContent=`${$('estimate').textContent} ${$('candidate-value').textContent} ${$('comparison').textContent} ${$('feedback').textContent} Plotted rates ${fmt(lo)} to ${fmt(hi)}. Invalid curve calls appear as gaps. All sampled curve values are available as text below.`;
}
async function run(nextMode,suite=false){
 if(busy)return;clear();lock(true);mode=nextMode;const id=++runId,version=revision,code=$('editor').value,data=selected().data;
 try{
  const response=await(mode==='reference'?reference:student).run({mode,code:mode==='reference'?undefined:code,data,suite},{isCurrent:()=>id===runId&&version===revision});
  if(id!==runId)return;if(version!==revision){$('status').textContent='Inputs changed. Python stays ready; rerun for the current inputs.';return;}
  $('stdout').textContent=response.stdout;$('output').hidden=!response.stdout;if(response.error){$('error').textContent=response.error;$('error').hidden=false;}
  if(response.points.some(p=>p[1]!==null)){
   result=response;inspected=result.points[60];$('candidate').value=60;$('results').hidden=false;$('empty').hidden=true;$('view-title').textContent=mode==='reference'?'Reference likelihood and estimate':'Likelihood and estimate from your code';draw();
  }
 }catch(error){if(id===runId&&version===revision){$('error').textContent=error.message;$('error').hidden=false;}}
 finally{if(id===runId&&version===revision)lock(false);}
}
$('run').onclick=()=>run('student');$('reference').onclick=()=>run('reference');$('test').onclick=()=>run('student',true);
$('stop').onclick=()=>{++runId;(mode==='reference'?reference:student).cancel();lock(false);};
$('case').onchange=()=>{invalidate();};
$('candidate').oninput=()=>{inspected=result.points[Number($('candidate').value)];draw();};
$('inspect-estimate').onclick=()=>{inspected=[result.estimate,result.estimate_value];draw();};
$('left').onclick=()=>{inspected=result.neighbors[0]||null;draw();};$('right').onclick=()=>{inspected=result.neighbors[1]||null;draw();};
$('editor').addEventListener('input',()=>{lines();if(mode!=='reference')invalidate();});$('editor').addEventListener('scroll',lines);
let escapeTab=false;$('editor').addEventListener('keydown',event=>{if(event.key==='Escape'){escapeTab=true;return;}if(event.key==='Tab'&&!event.shiftKey&&!escapeTab){event.preventDefault();const e=$('editor'),change=indent(e.value,e.selectionStart,e.selectionEnd);e.value=change.text;e.setSelectionRange(change.start,change.end);e.dispatchEvent(new Event('input'));}else if(event.key!=='Shift')escapeTab=false;if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run('student');}});$('editor').addEventListener('blur',()=>{escapeTab=false;});
window.addEventListener('resize',()=>{if(result)draw();});window.addEventListener('pagehide',()=>{student.dispose('Page closed');reference.dispose('Page closed');});lines();clear();
// Shared CodeMirror editor (../_shared/editor.mjs). The textarea keeps working as before; its value now proxies the editor.
window.pythonEditor=createEditor({textarea:$('editor'),gutter:$('line-numbers'),manage:false,enhance:!new URLSearchParams(location.search).has('plain_editor')});

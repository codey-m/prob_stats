import {installReasoning,describe,resetProgress} from './reasoning.mjs';
import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
import {cases,starter,segments,indent,contributionRules,matchingRecipes} from './model.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=x=>x===null||x===undefined?'—':Math.abs(x)>=10000||(x!==0&&Math.abs(x)<.001)?Number(x).toExponential(3):Number(x).toFixed(4).replace(/\.?0+$/,'');
let result=null,mode='',busy=false,revision=0,runId=0,index=60;
$('editor').value=starter;
for(const c of cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('case').append(option);}
const selected=()=>cases.find(c=>c.id===$('case').value);
function clear(){resetProgress();result=null;$('results').hidden=true;$('empty').hidden=false;$('error').hidden=true;$('output').hidden=true;const c=selected();$('inputs').textContent=`x = ${c.data.join(', ')} · n = ${c.data.length} · Σx = ${c.data.reduce((a,b)=>a+b,0)}`;}
function invalidate(){revision++;if(busy){const executor=mode==='reference'?reference:student;if(!executor.isLoading)executor.cancel();lock(false);}clear();}
function lock(value){busy=value;for(const id of ['run','reference','test'])$(id).disabled=value;$('stop').disabled=!value;}
const status=({message})=>{$('status').textContent=message;};
const student=new PythonExecutor({onStatus:status}),reference=new PythonExecutor({onStatus:status,role:'reference'});
function lines(){const e=$('editor');$('line-numbers').textContent=e.value.split('\n').map((_,i)=>i+1).join('\n');$('line-numbers').scrollTop=e.scrollTop;}
function node(tag,attrs={},content,parent=$('drawing')){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(content!==undefined)e.textContent=content;parent.append(e);return e;}
let geometry=null;
function draw(){
 if(!result)return;const refocus=document.activeElement?.id==='handle';
 const points=result.points,[lo]=points[0],[hi]=points.at(-1),valid=points.filter(p=>p[1]!==null),prev=result.previous||null,e=result.estimate,inView=t=>t!==null&&t>=lo&&t<=hi;
 const scores=[...valid.map(p=>p[1]),...(prev?prev.points.filter(p=>p[1]!==null).map(p=>p[1]):[]),...(inView(e)&&result.estimate_value!==null?[result.estimate_value]:[])];
 const scale=Math.max(1,...scores.map(Math.abs)),min=Math.min(...scores.map(v=>v/scale)),max=Math.max(...scores.map(v=>v/scale)),pad=(max-min||.1)*.08;
 const width=Math.max(270,$('plot').getBoundingClientRect().width),left=65,right=width-16,top=30,bottom=240;
 const x=v=>left+(v-lo)/(hi-lo)*(right-left),y=v=>bottom-((v/scale-min+pad)/(max-min+2*pad))*(bottom-top);geometry={x,left,right,lo,hi};
 $('plot').setAttribute('viewBox',`0 0 ${width} 300`);$('drawing').replaceChildren();node('text',{x:left,y:16},'ℓ(θ)');
 for(let i=0;i<=3;i++){const s=(min+(max-min)*i/3)*scale;node('line',{x1:left,x2:right,y1:y(s),y2:y(s),stroke:'#e1e8ec'});node('text',{x:left-5,y:y(s)+5,'text-anchor':'end'},Number(s.toPrecision(3)).toString());}
 if(prev){for(const g of segments(prev.points))node('path',{d:g.map(([a,b],i)=>`${i?'L':'M'}${x(a).toFixed(2)},${y(b).toFixed(2)}`).join(' '),stroke:'#743884','stroke-width':2,'stroke-dasharray':'3 5',fill:'none',class:'previous-curve'});
  if(inView(prev.estimate)&&prev.estimate_value!==null){const px=x(prev.estimate),py=y(prev.estimate_value);node('path',{d:`M ${px} ${py-7} L ${px+7} ${py} L ${px} ${py+7} L ${px-7} ${py} Z`,fill:'white',stroke:'#743884','stroke-width':2});node('text',{x:px,y:py-12,'text-anchor':'middle',fill:'#743884'},prev.case.chip);}}
 for(const g of segments(points))node('path',{d:g.map(([a,b],i)=>`${i?'L':'M'}${x(a).toFixed(2)},${y(b).toFixed(2)}`).join(' '),stroke:'#145c68','stroke-width':2.5,fill:'none'});
 if(e!==null&&e!==undefined){
  if(inView(e)){const cx=x(e);node('line',{x1:cx,x2:cx,y1:top,y2:bottom,stroke:'#9a3d08','stroke-width':2,'stroke-dasharray':'6 4'});if(result.estimate_value!==null){const cy=y(result.estimate_value);node('path',{d:`M ${cx} ${cy-7} L ${cx+7} ${cy} L ${cx} ${cy+7} L ${cx-7} ${cy} Z`,fill:'#9a3d08',class:'estimate'});}}
  else node('text',{x:e>hi?right:left,y:top+4,'text-anchor':e>hi?'end':'start',fill:'#9a3d08',class:'offaxis'},e>hi?`◆ θ̂ = ${fmt(e)} →`:`← ◆ θ̂ = ${fmt(e)}`);
 }
 index=Math.max(0,Math.min(points.length-1,index));const cand=points[index];
 // The candidate is a slider: drag on the plot or use arrow keys.
 const handle=node('g',{id:'handle',role:'slider',tabindex:0,'aria-label':'Candidate rate θ','aria-valuemin':fmt(lo),'aria-valuemax':fmt(hi),'aria-valuenow':fmt(cand[0]),'aria-valuetext':`θ ${fmt(cand[0])}, ℓ ${fmt(cand[1])}`});
 node('line',{x1:x(cand[0]),x2:x(cand[0]),y1:top,y2:bottom,stroke:'#743884','stroke-width':1,'stroke-opacity':.5},undefined,handle);
 if(cand[1]!==null)node('circle',{cx:x(cand[0]),cy:y(cand[1]),r:8,fill:'white',stroke:'#743884','stroke-width':3,class:'candidate'},undefined,handle);
 const axis=v=>Number(v.toPrecision(3)).toString();for(let i=0;i<=4;i++){const t=lo+(hi-lo)*i/4;node('text',{x:x(t),y:265,'text-anchor':i===0?'start':i===4?'end':'middle'},axis(t));}node('text',{x:(left+right)/2,y:292,'text-anchor':'middle'},'θ (rate)');
 const better=result.estimate_value===null||result.estimate_value===undefined?null:result.neighbors.filter(p=>p[1]!==null&&p[1]>result.estimate_value+1e-10).length>0;
 const read=$('readout');read.replaceChildren();const span=(t,c)=>{const s=document.createElement('span');s.textContent=t;if(c)s.className=c;read.append(s);};
 span(e===null||e===undefined?'◆ θ̂: step 3':`◆ θ̂ = ${fmt(e)}`);span(`○ θ = ${fmt(cand[0])}, ℓ = ${fmt(cand[1])}`,'muted');
 if(better!==null)span(better?'✗ a nearby θ scores higher':'✓ ◆ beats θ̂ ± 20%',better?'chip bad':'chip ok');
 strip(cand);
 $('feedback').textContent=mode==='choices'?'':result.issues.length?result.issues.join(' '):'The likelihood values, rate estimate and positive-domain checks match the independent checks.';
 const matches=mode==='choices'?[]:matchingRecipes(selected().data,result);$('recipe-description').textContent=matches.length?'Matches: '+matches.join(' or ')+' · describes output, not a code trace':mode==='choices'?'':'Matches none of the listed recipes · describes output, not a code trace';
 $('text-curve').textContent=points.map(([a,b])=>`θ ${fmt(a)}: ${b===null?'call failed':fmt(b)}`).join('; ');
 $('suite-panel').hidden=!result.suite.length;$('suite').replaceChildren(...result.suite.map(r=>{const s=document.createElement('span');s.className='chip '+(r.passed?'ok':'bad');s.textContent=`${r.passed?'✓':'✗'} ${r.name}: ${r.passed?'passed':r.issues.join(' ')}`;return s;}));
 $('plot-description').textContent=`Curve over θ ${fmt(lo)} to ${fmt(hi)}. ${read.textContent}`;
 describe(selected(),result,mode,index);
 if(refocus)$('handle').focus();
}
// Terms at the candidate rate, stacked so their total is visibly the curve value. Recipe and reference only.
function strip(cand){
 const box=$('strip');box.replaceChildren();if(mode==='student'||cand[1]===null)return;
 const data=selected().data,rule=mode==='choices'?result.rules[0]:'log',parts=data.map(x=>contributionRules[rule].one(cand[0],x)),total=parts.reduce((a,b)=>a+b,0),sum=parts.reduce((a,b)=>a+Math.abs(b),0)||1;
 const bar=document.createElement('div');bar.className='strip-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',`Terms at θ ${fmt(cand[0])}: ${parts.map((v,i)=>`x${i+1} ${fmt(v)}`).join(', ')}; sum ${fmt(total)}`);
 parts.forEach((v,i)=>{const s=document.createElement('span');s.style.flex=String(Math.abs(v)/sum);s.textContent=Math.abs(v)/sum>.09?`x${i+1}`:'';s.title=`x${i+1} = ${data[i]}: ${fmt(v)}`;bar.append(s);});
 const t=document.createElement('span');t.className='strip-total';t.textContent=`Σ = ${fmt(total)}`;box.append(bar,t);
}
function setIndex(i){if(!result)return;index=Math.max(0,Math.min(result.points.length-1,i));draw();}
$('plot').addEventListener('pointerdown',ev=>{if(!geometry)return;$('plot').setPointerCapture(ev.pointerId);move(ev);});
$('plot').addEventListener('pointermove',ev=>{if(ev.buttons&&geometry)move(ev);});
function move(ev){const r=$('plot').getBoundingClientRect(),vb=$('plot').viewBox.baseVal,px=(ev.clientX-r.left)*vb.width/r.width,f=(px-geometry.left)/(geometry.right-geometry.left);setIndex(Math.round(f*120));}
$('plot').addEventListener('keydown',ev=>{if(ev.target.id!=='handle')return;const step={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:10,PageDown:-10}[ev.key];if(step){ev.preventDefault();setIndex(index+step);}else if(ev.key==='Home'||ev.key==='End'){ev.preventDefault();setIndex(ev.key==='Home'?0:120);}});
let shownCase=null;
// Keep the dragged candidate while the hand route updates on the same data; reset otherwise.
function show(response,nextMode,title){if(!(nextMode==='choices'&&mode==='choices'&&shownCase===selected().id))index=60;shownCase=selected().id;result=response;mode=nextMode;$('results').hidden=false;$('empty').hidden=true;$('view-title').textContent=title;draw();}
async function run(nextMode,suite=false){
 if(busy)return;clear();lock(true);mode=nextMode;const id=++runId,version=revision,code=$('editor').value,data=selected().data;
 try{
  const response=await(mode==='reference'?reference:student).run({mode,code:mode==='reference'?undefined:code,data,suite},{isCurrent:()=>id===runId&&version===revision});
  if(id!==runId)return;if(version!==revision){$('status').textContent='Inputs changed. Python stays ready; rerun for the current inputs.';return;}
  $('stdout').textContent=response.stdout;$('output').hidden=!response.stdout;if(response.error){$('error').textContent=response.error;$('error').hidden=false;}
  if(response.points.some(p=>p[1]!==null))show(response,mode,mode==='reference'?'Reference ℓ(θ)':'ℓ(θ) from your code');
 }catch(error){if(id===runId&&version===revision){$('error').textContent=error.message;$('error').hidden=false;}}
 finally{if(id===runId&&version===revision)lock(false);}
}
$('run').onclick=()=>run('student');$('reference').onclick=()=>run('reference');$('test').onclick=()=>run('student',true);
$('stop').onclick=()=>{++runId;(mode==='reference'?reference:student).cancel();lock(false);};
$('case').onchange=()=>{invalidate();};
$('editor').addEventListener('input',()=>{lines();if(mode==='student')invalidate();});$('editor').addEventListener('scroll',lines);
let escapeTab=false;$('editor').addEventListener('keydown',event=>{if(event.key==='Escape'){escapeTab=true;return;}if(event.key==='Tab'&&!event.shiftKey&&!escapeTab){event.preventDefault();const e=$('editor'),change=indent(e.value,e.selectionStart,e.selectionEnd);e.value=change.text;e.setSelectionRange(change.start,change.end);e.dispatchEvent(new Event('input'));}else if(event.key!=='Shift')escapeTab=false;if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run('student');}});$('editor').addEventListener('blur',()=>{escapeTab=false;});
window.addEventListener('resize',()=>{if(result)draw();});window.addEventListener('pagehide',()=>{student.dispose('Page closed');reference.dispose('Page closed');});lines();clear();
installReasoning({selected,clear:invalidate,apply:response=>{invalidate();show(response,'choices','Your ℓ(θ)');}});
// Shared CodeMirror editor (../_shared/editor.mjs). The textarea keeps working as before; its value now proxies the editor.
window.pythonEditor=createEditor({textarea:$('editor'),gutter:$('line-numbers'),manage:false,enhance:!new URLSearchParams(location.search).has('plain_editor')});

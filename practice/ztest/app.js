import {installReasoning,describeTest,resetProgress} from './reasoning.mjs';
import {config,cases,render,inputs,transfer} from './model.mjs';
import {createEditor} from './editor.mjs';
import {PythonExecutor} from './execution.mjs';
const $=id=>document.getElementById(id);
let result=null,mode='',busy=false,revision=0,runId=0,selection=0,comparisonId='',signature='';
const completed=new Map();
$('title').textContent=config.title;$('task').textContent=`${config.function}: ${config.task}`;$('hint').textContent=config.hint;$('editor').value=config.starter;$('transfer').textContent=transfer;
for(const c of cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('case').append(option);}
if($('threshold-control'))$('threshold-control').hidden=config.kind!=='classification';
const selected=()=>cases.find(c=>c.id===$('case').value),status=({message})=>{$('status').textContent=message;};
const student=new PythonExecutor({onStatus:status}),reference=new PythonExecutor({onStatus:status,role:'reference'});
function lock(value){busy=value;for(const id of ['run','reference','test'])$(id).disabled=value;$('stop').disabled=!value;}
function clear(){resetProgress();result=null;$('results').hidden=true;$('empty').hidden=false;$('error').hidden=true;$('output').hidden=true;$('inputs').textContent=inputs(selected());}
function invalidate(){revision++;if(busy){const e=mode==='reference'?reference:student;if(!e.isLoading)e.cancel();lock(false);}clear();}
function lines(){const e=$('editor');$('line-numbers').textContent=e.value.split('\n').map((_,i)=>i+1).join('\n');$('line-numbers').scrollTop=e.scrollTop;}
function draw(){if(!result)return;const focus=document.activeElement?.getAttribute('data-focus');const disclosures=new Map([...$('scene').querySelectorAll('details')].map(d=>[d.querySelector('summary')?.textContent,d.open]));
 describeTest(selected(),result,mode);
 const eligible=[...completed.values()].filter(row=>row.signature===signature&&row.case.id!==selected().id);
 $('comparison-control').hidden=config.kind==='classification'||!eligible.length;
 const previous=eligible.find(row=>row.case.id===comparisonId)||null;
 $('comparison-label').textContent=previous?`Saved ${mode==='reference'?'reference':'student'} run, same code and settings. Dashed/dotted overlay: ${previous.case.name}.`:'Only completed runs from the same code and mode can be compared.';
 render($,selected(),result.values,config.kind==='classification'?Number($('threshold').value):0,selection,next=>{selection=next;draw();},previous);for(const d of $('scene').querySelectorAll('details')){const key=d.querySelector('summary')?.textContent;if(disclosures.has(key))d.open=disclosures.get(key);}$('feedback').textContent=result.issues.length?result.issues.join(' '):'The returned values match the independent check for this case.';$('suite-panel').hidden=!result.suite.length;$('suite').textContent=result.suite.map(row=>`${row.name}: ${row.passed?'passed':row.issues.join(' ')}`).join(' ');if(focus)document.querySelector(`[data-focus="${focus}"]`)?.focus();}
async function run(nextMode,suite=false){
 if(busy)return;clear();lock(true);mode=nextMode;const id=++runId,version=revision,caseId=selected().id,threshold=config.kind==='classification'?Number($('threshold').value):undefined,code=$('editor').value;
 signature=JSON.stringify([mode,mode==='student'?code:'reference',threshold]);
 try{
  const response=await(mode==='reference'?reference:student).run({mode,caseId,...(config.kind==='classification'?{threshold}:{}),code:mode==='reference'?undefined:code,suite},{isCurrent:()=>id===runId&&version===revision});
  if(id!==runId||version!==revision)return;
  $('stdout').textContent=response.stdout;$('output').hidden=!response.stdout;
  if(response.error){$('error').textContent=response.error;$('error').hidden=false;}
  if(response.values){result=response;selection=0;
   completed.set(signature+'|'+caseId,{signature,case:selected(),values:response.values});if(completed.size>20)completed.delete(completed.keys().next().value);
   const others=[...completed.values()].filter(row=>row.signature===signature&&row.case.id!==caseId);
   comparisonId=(others.find(row=>row.case.id==='original')||others.at(-1))?.case.id||'';
   $('compare').replaceChildren();const none=document.createElement('option');none.value='';none.textContent='No comparison';$('compare').append(none);
   for(const row of others){const option=document.createElement('option');option.value=row.case.id;option.textContent=row.case.name;$('compare').append(option);}$('compare').value=comparisonId;$('results').hidden=false;$('empty').hidden=true;$('view-title').textContent=mode==='reference'?'Reference result':'Result from your code';draw();}
 }catch(error){if(id===runId&&version===revision&&!error.superseded){$('error').textContent=error.message;$('error').hidden=false;}}
 finally{if(id===runId&&version===revision)lock(false);}
}
$('run').onclick=()=>run('student');$('reference').onclick=()=>run('reference');$('test').onclick=()=>run('student',true);$('stop').onclick=()=>{++runId;(mode==='reference'?reference:student).cancel();lock(false);};
$('compare').onchange=()=>{comparisonId=$('compare').value;draw();};
$('case').onchange=invalidate;if($('threshold'))$('threshold').onchange=invalidate;
$('editor').addEventListener('input',()=>{lines();if(mode==='student')invalidate();});$('editor').addEventListener('scroll',lines);
let escapeTab=false;$('editor').addEventListener('keydown',event=>{const e=$('editor');if(event.key==='Escape'){escapeTab=true;return;}if(event.key==='Tab'&&!event.shiftKey&&!escapeTab){event.preventDefault();const start=e.selectionStart,end=e.selectionEnd,line=e.value.lastIndexOf('\n',start-1)+1;if(start===end){e.setRangeText('    ',start,end,'end');}else{const block=e.value.slice(line,end);e.setRangeText(block.split('\n').map(s=>'    '+s).join('\n'),line,end,'select');}e.dispatchEvent(new Event('input'));}else if(event.key!=='Shift')escapeTab=false;if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run('student');}});$('editor').addEventListener('blur',()=>{escapeTab=false;});
window.addEventListener('resize',()=>{if(result)draw();});window.addEventListener('pagehide',()=>{student.dispose('Page closed');reference.dispose('Page closed');});lines();clear();
installReasoning({selected,clear:invalidate,apply:response=>{invalidate();mode='choices';signature='choices';result=response;$('view-title').textContent='Your test';$('results').hidden=false;$('empty').hidden=true;draw();}});
// Shared CodeMirror editor (../_shared/editor.mjs). The textarea keeps working as before; its value now proxies the editor.
window.pythonEditor=createEditor({textarea:$('editor'),gutter:$('line-numbers'),manage:false,enhance:!new URLSearchParams(location.search).has('plain_editor')});

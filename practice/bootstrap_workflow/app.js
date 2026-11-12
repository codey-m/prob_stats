import {CASES,STARTER,workflow,FORMULA,fmt,classify,describeWorkflow} from './model.mjs';
import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const el=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
let ci=0,version=0,busy=false,active=null,last=null,ri=0,phase=0,revealed=0,timer=null,focusSlot=null;
// Foundation activity: the menus plan the loop (step 1); the Python loop passing every practice table completes it.
const done={menus:false,code:false};
function progress(){const m=x=>x?'done':'not yet';$('progress').textContent=`Plan the loop with the menus, ${m(done.menus)}; write the loop in Python (all practice tables pass), ${m(done.code)}. The Python loop completes the activity.`;}
const isCheck=()=>!!current().check;
const current=()=>CASES[ci],reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const policies=()=>({sample:$('sample-rule').value,stat:$('stat-rule').value,store:$('store-rule').value});
const currentRecord=()=>last?.result.records[ri];
function status(ex,{state,message}){if(active!==ex)return;$('runtime').textContent=message;$('retry').hidden=state!=='error';}
const metrics=m=>window.dispatchEvent(new CustomEvent('python-run-measured',{detail:m}));
const student=new PythonExecutor({role:'student',onStatus:s=>status(student,s),onMetrics:metrics});
const reference=new PythonExecutor({role:'reference',onStatus:s=>status(reference,s),onMetrics:metrics});
// The check table belongs to a course check: reference and menu runs are off there, and results carry no verdict.
function controlState(){for(const id of ['run','reference','suite','run-workflow'])$(id).disabled=busy;if(isCheck()){$('reference').disabled=true;$('run-workflow').disabled=true;}$('stop').disabled=!busy;$('check-note').hidden=!isCheck();}
function stopReplay(){clearTimeout(timer);timer=null;$('replay').textContent='Replay';}
function clear(message){version++;stopReplay();if(busy){busy=false;if(active&&!active.isLoading)active.cancel();}last=null;focusSlot=null;ri=0;phase=0;revealed=0;$('results').hidden=true;$('run-label').textContent=message;$('choice-status').textContent='';controlState();drawSource();}
const origin=(value,j)=>current().rows.flatMap((row,i)=>Math.abs(row[j]-value)<1e-9?[i]:[]);
const letter=i=>String.fromCharCode(65+i);
function tableHead(first){const h=el('thead'),r=el('tr');for(const text of [first,'x','y'])r.append(el('th',{scope:'col'},text));h.append(r);return h;}
function drawSource(){const c=current(),t=el('table'),cap=el('caption',{},c.name);t.append(cap,tableHead('source index'));const body=el('tbody'),sample=currentRecord()?.sample;
 c.rows.forEach((r,i)=>{const tr=el('tr');tr.append(el('th',{scope:'row'},`${i} · ${letter(i)}`));for(let j=0;j<2;j++){const lit=sample&&focusSlot!==null&&origin(sample[focusSlot][j],j).includes(i);tr.append(el('td',{class:lit?'source-lit':''},fmt(r[j])));}body.append(tr);});t.append(body);$('source').replaceChildren(t);$('case-name').textContent='The row labels A, B, … identify paired observations.';$('plans').textContent=`draw_plan = ${JSON.stringify(c.draws)}\n# ${c.draws.length} replicates; ${c.rows.length} draws per replicate\n# “Draw x and y separately” takes each y from the next replicate’s indices (the last wraps to the first).`;
}
function drawSample(){const record=currentRecord();$('sample-grid').replaceChildren();if(!record?.sample){$('sample-grid').textContent=record?'No usable paired sample was returned for this replicate.':'';return;}
 const t=el('table');t.append(el('caption',{},'Returned sample. Source letters describe value matches.'),tableHead('sample slot'));const body=el('tbody');
 record.sample.forEach((row,k)=>{const tr=el('tr');tr.append(el('th',{scope:'row'},String(k)));for(let j=0;j<2;j++){const td=el('td'),ids=origin(row[j],j),label=ids.length?ids.map(letter).join('/'):'no source match';const b=el('button',{'data-slot':k,'aria-label':`Sample slot ${k}, ${j===0?'x':'y'} ${fmt(row[j])}; value matches ${label}`},fmt(row[j]));b.append(el('span',{class:'origin'},label));b.onclick=()=>{focusSlot=k;drawSource();$('inspection').textContent=`Sample slot ${k}: x = ${fmt(row[0])} matches ${origin(row[0],0).map(letter).join('/')||'no source x'}, y = ${fmt(row[1])} matches ${origin(row[1],1).map(letter).join('/')||'no source y'}.`;};td.append(b);tr.append(td);}body.append(tr);});t.append(body);$('sample-grid').append(t);
}
const S='http://www.w3.org/2000/svg';const sn=(tag,a={})=>{const e=document.createElementNS(S,tag);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);return e;};
function drawDistribution(){const box=$('distribution');box.replaceChildren();const records=last.result.records.slice(0,revealed),values=records.flatMap((r,i)=>r.value===null?[]:[{v:r.value,i}]);
 box.append(el('p',{},`${records.length} stored items revealed; ${values.length} are numeric statistics.`));
 if(!values.length){box.append(el('p',{},records.length?'The stored items are available under “Inspect the stored values”.':'A statistic enters the distribution when its replicate is stored.'));return;}
 const vs=values.map(o=>o.v),lo=Math.min(...vs),hi=Math.max(...vs),pad=Math.max(1,(hi-lo)*.15,Math.abs(lo)*.02),low=lo-pad,high=hi+pad;
 const px=v=>40+(v-low)/(high-low)*260,svg=sn('svg',{viewBox:'0 0 340 285',role:'group','aria-label':`Revealed stored statistics. ${values.length} points. Exact values are available by selecting each point or in the stored values disclosure.`});
 svg.append(sn('line',{x1:40,x2:300,y1:225,y2:225,stroke:'#657e8b','stroke-width':1.5}));
 const txt=(x,y,text,a={})=>{const e=sn('text',{x,y,...a});e.textContent=text;svg.append(e);};
 for(const v of [low,(low+high)/2,high]){svg.append(sn('line',{x1:px(v),x2:px(v),y1:225,y2:232,stroke:'#657e8b'}));txt(px(v),252,fmt(v),{'text-anchor':'middle'});}txt(170,279,'sample covariance',{'text-anchor':'middle'});
 let top=200;const stacks={};for(const {v,i}of values){const x=px(v),key=Math.round(x/16),level=stacks[key]||0;stacks[key]=level+1;const y=211-level*14;top=Math.min(top,y-18);
 const point=sn('circle',{cx:x,cy:y,r:5,fill:i===ri?'#97460d':'#194f67',tabindex:0,role:'button','data-replicate':i,'aria-label':`Replicate ${i+1}: stored covariance ${fmt(v)}. Inspect its returned sample.`});
 const inspect=()=>{stopReplay();ri=i;phase=2;focusSlot=null;render();$('inspection').textContent=`Replicate ${i+1} stored ${fmt(v)}. Its returned sample is shown above.`;const target=$('distribution').querySelector(`[data-replicate="${i}"]`);target?.focus({preventScroll:true});};point.onclick=inspect;point.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect();}};svg.append(point);}
 svg.setAttribute('viewBox',`0 ${Math.max(0,top)} 340 ${285-Math.max(0,top)}`);box.append(svg);
}
function render(){if(!last)return;const records=last.result.records,r=currentRecord();$('results').hidden=false;for(const id of ['step','show-all','replay','replicate'])$(id).disabled=!records.length;
 $('step').disabled=!records.length||(ri===records.length-1&&phase===2);$('replicate').value=String(ri);
 if(!r){$('plan-label').textContent='';$('stored').textContent='';$('phase').textContent='No replicate records to inspect.';$('sample-grid').replaceChildren();$('calculation').hidden=true;$('distribution').replaceChildren();return;}
 if(phase===2)revealed=Math.max(revealed,ri+1);
 $('phase').textContent=`Replicate ${ri+1} of ${records.length}: ${['returned sample','returned statistic','stored item'][phase]}`;
 const pi=r.plan??ri;$('plan-label').textContent=pi<current().draws.length?`Disclosed source indices for ${pi===ri?'this replicate':`replicate ${pi+1}, the only one kept`}: [${current().draws[pi].join(', ')}]`:'This record has no corresponding draw plan.';
 drawSample();drawSource();$('calculation').hidden=phase===0;
 if(phase>0){let text=last.mode==='workflow'?`The assembled workflow evaluated ${last.policies.stat==='sample'?'this returned sample':'the original source rows'}: ${fmt(r.computed)}.`:r.value!==null?`The function returned the numeric statistic ${fmt(r.value)}.`:`Stored item: ${r.stored}.`;
 if(r.error)text+=` ${r.error}`;if(phase===2)text+=` Stored item: ${r.stored}.`;$('calculation').textContent=text;}
 drawDistribution();$('stored').textContent=records.map((x,i)=>`${i+1}: ${x.stored}`).join('\n');
}
function show(result,mode,selectedPolicies=null){stopReplay();
 // Code results are described with the menu's vocabulary. A kept-latest record is compared with the plan it came from.
 const k=mode==='student'&&!result.error?classify(current(),result.records):null;
 if(k?.store==='latest')result.records.forEach((r,i)=>{if(r.plan===undefined){r.plan=k.planOf(i);r.sample_ok=JSON.stringify(r.sample)===JSON.stringify(current().draws[r.plan].map(j=>current().rows[j]));}});last={result,mode,policies:selectedPolicies};ri=0;phase=0;revealed=0;focusSlot=null;
 $('run-label').textContent=mode==='reference'?'Reference result · current table':mode==='workflow'?'Assembled workflow · current rules':'Your result · current code and table';
 const n=result.records.length,samples=result.records.filter(r=>!r.sample_ok).length,values=result.records.filter(r=>!r.value_ok).length;
 $('verdict').className=isCheck()?'':result.passed?'pass':'fail'; $('pattern').textContent=k&&!isCheck()?describeWorkflow(k):'';
 if(mode==='workflow'&&result.passed)done.menus=true;if(mode==='student'&&result.suite?.length&&result.suite.every(r=>r.passed))done.code=true;progress();
 $('verdict').textContent=result.error?'The function did not return a usable collection.':isCheck()?`${n} record${n===1?'':'s'} returned for ${current().draws.length} plans. The check table has no verdict: use your stored values to answer the course check.`:`${n} record${n===1?'':'s'} returned for ${current().draws.length} plans. ${samples} samples differ from their row plans; ${values} stored values differ from the covariance of their returned sample.${result.mutated?' A supplied input was changed.':''}`;
 $('error').hidden=!result.error;$('error').textContent=result.error||'';$('stdout-details').hidden=!result.stdout;$('stdout').textContent=result.stdout||'';$('inspection').textContent='Select a sampled value to highlight its source matches, or a distribution point to inspect its replicate.';
 $('replicate').replaceChildren(...result.records.map((_,i)=>el('option',{value:i},String(i+1))));
 $('test-details').hidden=!result.suite;if(result.suite){$('test-summary').textContent=`Other tables: ${result.suite.filter(r=>r.passed).length} of ${result.suite.length} passed`;$('test-results').replaceChildren(...result.suite.map(r=>el('p',{},`${r.name}: ${r.passed?'matches the workflow':'differs or raised an error'}`)));$('test-details').open=true;}
 if(reduced()&&n){ri=n-1;phase=2;}render();
}
function step(){if(!last?.result.records.length)return;focusSlot=null;$('inspection').textContent='Select a returned sample value or distribution point to inspect it.';if(phase<2)phase++;else if(ri<last.result.records.length-1){ri++;phase=0;}render();}
function replayTick(){step();if(ri===last.result.records.length-1&&phase===2){stopReplay();return;}timer=setTimeout(replayTick,750);}
async function run(suite=false,mode='student'){
 if(busy)return;stopReplay();busy=true;const stamp=version;active=mode==='reference'?reference:student;const ex=active;
 const request={mode,case:structuredClone(current()),suite};if(mode==='student')request.code=editor.getValue();last=null;$('results').hidden=true;$('run-label').textContent=mode==='reference'?'Running reference…':'Running your code…';controlState();
 try{const result=await ex.run(request,{isCurrent:()=>stamp===version});if(stamp===version)show(result,mode);}
 catch(e){if(stamp===version&&!e.superseded){show({records:[],passed:false,error:e.message,stdout:''},mode);$('run-label').textContent='Run stopped';}}
 finally{if(stamp===version){busy=false;controlState();}}
}
$('code').value=STARTER;const editor=createEditor({textarea:$('code'),gutter:$('line-numbers'),manage:true,enhance:!params.has('plain_editor'),onRun:()=>run(),onChange:()=>{if((busy&&active===student)||last?.mode==='student'||!last&&active!==reference)clear('Code changed. Run again to reveal its result.');}});window.pythonEditor=editor;
$('formula').innerHTML=FORMULA;
$('run-workflow').onclick=()=>{if(busy||isCheck())return;try{const p=policies(),result=workflow(current(),p);active=null;show(result,'workflow',p);$('choice-status').textContent='';}catch(e){$('choice-status').textContent=e.message;}};
for(const id of ['sample-rule','stat-rule','store-rule'])$(id).onchange=()=>clear('Workflow changed. Run again to reveal its result.');
$('new-case').onclick=()=>{ci=(ci+1)%CASES.length;clear(isCheck()?'Check table. Run your Python loop to reveal its results.':'New table and plans. Run again to reveal results.');};
$('run').onclick=()=>run();$('reference').onclick=()=>{if(!isCheck())run(false,'reference');};$('suite').onclick=()=>run(true);$('stop').onclick=()=>{const ex=active;clear('Stopped. Your code is preserved.');ex?.cancel();};$('retry').onclick=()=>active?.load().catch(()=>{});
$('step').onclick=()=>{stopReplay();step();};$('show-all').onclick=()=>{stopReplay();ri=last.result.records.length-1;phase=2;focusSlot=null;render();};
$('replay').onclick=()=>{if(timer){stopReplay();return;}ri=0;phase=0;revealed=0;focusSlot=null;if(reduced()){ri=last.result.records.length-1;phase=2;render();return;}render();$('replay').textContent='Pause';timer=setTimeout(replayTick,750);};
$('replicate').onchange=()=>{stopReplay();ri=Number($('replicate').value);phase=2;focusSlot=null;render();};
$('reset').onclick=()=>{editor.setValue(STARTER);if(last?.mode==='student')clear('Rule reset. Run again to reveal its result.');};
$('download').onclick=()=>{const helper=`def statistic(sample):\n    n = len(sample)\n    mx = sum(r[0] for r in sample) / n\n    my = sum(r[1] for r in sample) / n\n    return sum((r[0]-mx)*(r[1]-my) for r in sample)/(n-1)\n`;
 const text=`# One result per resample\nrows = ${JSON.stringify(current().rows)}\ndraw_plan = ${JSON.stringify(current().draws)}\n\n${helper}\n${editor.getValue()}\nprint(bootstrap(rows, draw_plan, statistic))\n`,url=URL.createObjectURL(new Blob([text],{type:'text/x-python'})),a=el('a',{href:url,download:'bootstrap_workflow.py'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
progress();window.addEventListener('pagehide',()=>{stopReplay();student.dispose('Page closed');reference.dispose('Page closed');});drawSource();

import {CASES,STAGES,starter,inputs,fmt} from './model.mjs';
import {PythonExecutor} from './execution.mjs';
import {createEditor} from './editor.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let stage='center',ci=0,version=0,busy=false,active=null,last=null,selection=new Set(),selected=null;
const drafts={center:starter('center'),project:starter('project')},current=()=>CASES[ci];
const isReference=()=>last?.mode==='reference';
const node=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
function status(ex,{state,message}){if(active!==ex)return;$('runtime').textContent=message;$('retry').hidden=state!=='error';}
const metrics=m=>window.dispatchEvent(new CustomEvent('python-run-measured',{detail:m}));
const student=new PythonExecutor({role:'student',packages:['numpy'],onStatus:s=>status(student,s),onMetrics:metrics});
const reference=new PythonExecutor({role:'reference',packages:['numpy'],onStatus:s=>status(reference,s),onMetrics:metrics});
function controls(){for(const id of ['run','reference','suite'])$(id).disabled=busy;$('stop').disabled=!busy;}
function table(container,grid,name,{interactive=false,output=false,means=false}={}){
 const t=node('table'),caption=node('caption',{},name);t.append(caption);
 const head=node('thead'),h=node('tr');h.append(node('th',{scope:'col'},'row'));
 for(let j=0;j<2;j++)h.append(node('th',{scope:'col'},`${output&&stage==='project'||name==='V'?'k':'j'}=${j}`));head.append(h);t.append(head);
 const body=node('tbody');grid.forEach((r,i)=>{const tr=node('tr');tr.append(node('th',{scope:'row'},`${name==='V'?'j':'i'}=${i}`));
 r.forEach((v,j)=>{const td=node('td'),key=`${name}:${i}:${j}`;let cls='';
 if(interactive&&selection.has(key))cls+=' picked';
 if(output&&i===0&&j===1)cls+=' target';
 if(output&&!isReference()&&!last.result.matches[i][j])cls+=' differs';
 if(!output&&selected&&stage==='center'&&j===selected[1])cls+=' support';
 if(!output&&selected&&stage==='project'&&((name==='C'&&i===selected[0])||(name==='V'&&j===selected[1])))cls+=' support';
 const b=node('button',{class:cls,'data-cell':key,'aria-label':`${name}[${i}, ${j}] = ${fmt(v)}${output&&i===0&&j===1?', calculation target':''}`,...(interactive?{'aria-pressed':String(selection.has(key))}:{})},fmt(v));
 b.onclick=()=>{if(output){selected=[i,j];drawInputs();drawOutput();inspect();}else if(interactive){selection.has(key)?selection.delete(key):selection.add(key);$('hand-feedback').textContent='';drawInputs();}container.querySelector(`[data-cell="${key}"]`)?.focus({preventScroll:true});};
 td.append(b);tr.append(td);});body.append(tr);});
 if(means){const tr=node('tr',{class:'mean'});tr.append(node('th',{scope:'row'},'mean'));
 for(let j=0;j<2;j++)tr.append(node('td',{},fmt(grid.reduce((s,r)=>s+r[j],0)/grid.length)));body.append(tr);}
 t.append(body);container.replaceChildren(t);
}
function drawInputs(){const c=current(),a=inputs(c),name=stage==='center'?'X':'C',g=stage==='center'?c.X:a.C;
 table($('input-grid'),g,name,{interactive:true});$('directions').hidden=stage!=='project';if(stage==='project')table($('v-grid'),a.V,'V',{interactive:true});
 $('case-name').textContent=c.name;$('input-help').textContent=`${name}.shape = (${g.length}, 2). Rows are observations; columns are features.`;
 $('input-code').textContent=stage==='center'?`import numpy as np\nX = np.array(${JSON.stringify(c.X)}, dtype=float)`:`import numpy as np\nC = np.array(${JSON.stringify(a.C)})\nV = np.array(${JSON.stringify(a.V)})`;
}
function targetValue(){const {C,V}=inputs(current());return stage==='center'?C[0][1]:C[0].reduce((s,v,j)=>s+v*V[j][1],0);}
function wanted(){return stage==='center'?current().X.map((_,i)=>`X:${i}:1`):['C:0:0','C:0:1','V:0:1','V:1:1'];}
function checkSelection(){const w=wanted(),exact=w.length===selection.size&&w.every(k=>selection.has(k));
 if(exact)$('hand-feedback').textContent=stage==='center'?'Yes: the selected entries form one feature across all observations.':'Yes: you selected one observation and one direction, paired by feature.';
 else if(!selection.size)$('hand-feedback').textContent='Select the entries you would use first.';
 else if(stage==='center'){
 const row=current().X.some((_,i)=>selection.size===2&&[0,1].every(j=>selection.has(`X:${i}:${j}`)));
 $('hand-feedback').textContent=row?'You selected both features of one observation. That averages across features within a row.':`You selected ${selection.size} entries; that set does not match this feature’s mean.`;
 }else $('hand-feedback').textContent=`You selected ${selection.size} entries. The selected observation and direction do not yet form this dot product.`;
}
const S='http://www.w3.org/2000/svg';
const sn=(tag,a={})=>{const e=document.createElementNS(S,tag);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);return e;};
function plot(title,points,{ghost=null,vectors=null,space='features'}={}){
 const fig=node('figure'),caption=node('figcaption',{},title);fig.append(caption);
 const svg=sn('svg',{viewBox:'0 0 320 295',role:'group','aria-label':`${title}. Coordinates are listed in the ${space==='features'?'input or output':'output'} table.`});
 const all=[...points,...(ghost||[]),[0,0]],extent=Math.max(1,...all.flat().map(Math.abs))*1.2;
 const px=x=>63+(x+extent)/(2*extent)*210,py=y=>248-(y+extent)/(2*extent)*210;
 const text=(x,y,s,a={})=>{const e=sn('text',{x,y,...a});e.textContent=s;svg.append(e);};
 svg.append(sn('line',{x1:63,x2:273,y1:py(0),y2:py(0),stroke:'#80949f'}),sn('line',{x1:px(0),x2:px(0),y1:38,y2:248,stroke:'#80949f'}));
 text(165,282,space==='features'?'feature 0':'PC1',{'text-anchor':'middle'});text(8,20,space==='features'?'feature 1':'PC2');
 for(const v of [-extent/2,extent/2]){text(px(v),266,fmt(v),{'text-anchor':'middle'});text(43,py(v)+4,fmt(v),{'text-anchor':'end'});}
 if(vectors)for(let k=0;k<2;k++){const r=extent*.7,x=vectors[0][k]*r,y=vectors[1][k]*r;svg.append(sn('line',{x1:px(-x),y1:py(-y),x2:px(x),y2:py(y),stroke:'#5f4a78','stroke-width':2,'stroke-dasharray':k?'3 4':'8 3'}));text(px(x),py(y)-8,`PC${k+1}`);}
 if(ghost)ghost.forEach((p,i)=>{svg.append(sn('circle',{cx:px(p[0]),cy:py(p[1]),r:5,fill:'white',stroke:'#4e6470','stroke-width':2}));
 const q=points[i];svg.append(sn('line',{x1:px(p[0]),y1:py(p[1]),x2:px(q[0]),y2:py(q[1]),stroke:'#9b4b12','stroke-dasharray':'3 3'}));});
 points.forEach((p,i)=>{const x=px(p[0]),y=py(p[1]),returned=ghost||space!=='features';
 const differs=returned&&last&&!isReference()&&last.result.matches[i].some(ok=>!ok);
 const point=returned?sn('path',{d:`M ${x} ${y-6} l 6 6 l -6 6 l -6 -6 Z`,fill:'#194f67',stroke:differs?'#9b4b12':'none','stroke-width':2,'stroke-dasharray':differs?'3 2':'none',tabindex:0,role:'button','data-point':i,'data-differs':String(!!differs),'aria-label':`Returned observation ${i}, coordinates ${p.map(fmt).join(', ')}. Inspect inputs.`}):sn('circle',{cx:x,cy:y,r:5,fill:'white',stroke:'#194f67','stroke-width':2});
 if(returned){const choose=()=>{selected=[i,1];for(const dot of svg.querySelectorAll('[data-point]')){dot.setAttribute('stroke',dot===point||dot.dataset.differs==='true'?'#9b4b12':'none');dot.setAttribute('stroke-width','3');}drawInputs();drawOutput();inspect();};point.onclick=choose;point.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};}
 svg.append(point);text(x+8,y-7,`${i}`);});
 fig.append(svg);return fig;
}
function drawPlots(){const c=current(),{C,V}=inputs(c),box=$('plots');box.replaceChildren();
 if(stage==='center'){box.append(plot('Input X',c.X));if(last?.result.values)box.append(plot('Returned C',last.result.values,{ghost:c.X}));}
 else{box.append(plot('Centered input C and supplied directions',C,{vectors:V}));if(last?.result.values)box.append(plot('Returned PCA coordinates Z',last.result.values,{space:'pcs'}));}
}
function inspect(){if(!selected||!last?.result.values){$('inspect').textContent='Select a returned point to inspect its coordinates, or inspect numeric entries below.';return;}
 const [i,j]=selected,v=last.result.values[i][j],{C,V}=inputs(current());
 const prefix=`Observation ${i} returned [${last.result.values[i].map(fmt).join(', ')}]. ${stage==='center'?'C':'Z'}[${i}, ${j}] = ${fmt(v)}. `;
 $('inspect').textContent=prefix+(stage==='center'?`Input X[${i}, ${j}] is ${fmt(current().X[i][j])}. The highlighted column contains the observations for feature ${j}.`:`The selected observation is [${C[i].map(fmt).join(', ')}]; direction PC${j+1} is [${V.map(r=>fmt(r[j])).join(', ')}]. The highlight shows the stated dot product, not a trace of your code.`);
}
function drawOutput(){if(!last?.result.values){$('output-grid').replaceChildren();return;}table($('output-grid'),last.result.values,stage==='center'?'C':'Z',{output:true,means:true});}
const patterns={column:'The returned values subtract a separate mean for each feature.',row:'The returned values subtract each observation’s row mean from that row.',global:'The returned values subtract one mean for the entire table.',unchanged:'The returned values equal the supplied input.', 'row-on-columns':'The returned values subtract row means along the columns. This square array lets the operation run without a shape error.',columns:'The returned values are dot products with the columns of V.',transposed:'The returned values are dot products with the rows of V. Both multiplications have compatible shapes.',elementwise:'The returned values are entry-by-entry products of C and V; no feature contributions were summed.'};
function show(result,mode){last={result,mode};selected=null;$('result-panel').hidden=false;$('run-label').textContent=mode==='reference'?'Reference result · current table':'Your result · current code and table';
 $('verdict').className=result.passed?'pass':'fail';$('verdict').textContent=result.error?'The function did not return a usable array.':result.mutated?'The function changed a supplied input. Its returned values are shown below.':result.passed?`${mode==='reference'?'Reference':'Your'} output matches this rule on this table.`:`${result.matches.flat().filter(x=>!x).length} of ${current().X.length*2} entries differ; dashed points have at least one differing coordinate.`;
 $('pattern').textContent=patterns[result.pattern]||'';$('error').hidden=!result.error;$('error').textContent=result.error||'';
 const err=result.error||'',shape=$('shape-diagram');shape.hidden=!err||!/broadcast|matmul|shape/i.test(err);shape.replaceChildren();
 if(!shape.hidden){shape.append(node('p',{},stage==='center'?'Subtraction aligns array dimensions from the right. Equal sizes or a size of 1 can align.':'In a matrix product, the last dimension of the left input meets the second-to-last dimension of the right input.'));
 shape.append(node('div',{class:'shape-row'},stage==='center'?`Supplied X: (${current().X.length}, 2)`:`Supplied C: (${current().X.length}, 2) × V: (2, 2) → required Z: (${current().X.length}, 2)`));
 const shapes=[...err.matchAll(/\([\d, ]+\)/g)].map(m=>m[0]);if(shapes.length)shape.append(node('div',{class:'shape-row'},`Shapes reported by Python: ${[...new Set(shapes)].join(' versus ')}`));
 if(result.returned_shape)shape.append(node('div',{class:'shape-row'},`Returned: (${result.returned_shape.join(', ')})`));}
 $('stdout-details').hidden=!result.stdout;$('stdout').textContent=result.stdout||'';$('test-details').hidden=!result.suite;
 if(result.suite){$('test-summary').textContent=`Other tables: ${result.suite.filter(r=>r.passed).length} of ${result.suite.length} passed`;$('test-results').replaceChildren(...result.suite.map(r=>node('p',{},`${r.name}: ${r.passed?'matches':r.error?'raised an error':r.mutated?'changed an input':'differs'}`)));$('test-details').open=true;}
 drawInputs();drawOutput();drawPlots();inspect();
}
function clear(message){version++;if(busy){busy=false;if(active&&!active.isLoading)active.cancel();}last=null;selected=null;$('result-panel').hidden=true;$('run-label').textContent=message;controls();drawInputs();drawOutput();drawPlots();}
async function run(suite=false,mode='student'){
 if(busy)return;busy=true;const stamp=version;active=mode==='reference'?reference:student;const ex=active;
 const request={mode,stage,case:structuredClone(current()),suite};if(mode==='student')request.code=editor.getValue();
 last=null;$('result-panel').hidden=true;$('run-label').textContent=mode==='reference'?'Running reference…':'Running your code…';drawPlots();controls();
 try{const result=await ex.run(request,{isCurrent:()=>stamp===version});if(stamp===version)show(result,mode);}
 catch(e){if(stamp===version&&!e.superseded){last=null;$('run-label').textContent='Run stopped';$('result-panel').hidden=false;$('verdict').textContent=e.message;$('error').hidden=true;$('pattern').textContent='';$('shape-diagram').hidden=true;$('output-grid').replaceChildren();$('test-details').hidden=true;$('stdout-details').hidden=true;$('inspect').textContent='';drawPlots();}}
 finally{if(stamp===version){busy=false;controls();}}
}
$('code').value=drafts.center;
const editor=createEditor({textarea:$('code'),gutter:$('line-numbers'),manage:true,enhance:!params.has('plain_editor'),onRun:()=>run(),onChange:()=>{drafts[stage]=editor.getValue();if(!(active===reference&&(busy||isReference())))clear('Code changed. Run again to reveal its output.');}});
window.pythonEditor=editor;
function renderStage(){const s=STAGES[stage];$('task-title').textContent=s.title;$('task').textContent=s.task;$('formula').innerHTML=s.math;$('hand-help').textContent=s.hand;$('interface').textContent=s.interface;$('hint').textContent=s.hint;$('transfer').textContent=s.transfer;for(const b of document.querySelectorAll('[data-stage]'))b.setAttribute('aria-pressed',String(b.dataset.stage===stage));}
function change(){selection.clear();$('hand-value').value='';$('hand-feedback').textContent='';clear('Inputs changed. Run again to reveal the output.');renderStage();}
for(const b of document.querySelectorAll('[data-stage]'))b.onclick=()=>{drafts[stage]=editor.getValue();stage=b.dataset.stage;editor.setValue(drafts[stage]);change();};
$('new-case').onclick=()=>{ci=(ci+1)%CASES.length;change();};
$('check-selection').onclick=checkSelection;$('clear-selection').onclick=()=>{selection.clear();$('hand-feedback').textContent='';drawInputs();};
$('check-value').onclick=()=>{const v=$('hand-value').valueAsNumber;$('hand-feedback').textContent=!Number.isFinite(v)?'Enter a number first.':Math.abs(v-targetValue())<=.01?'That matches the requested output entry to two decimals.':'That value differs from the requested output entry. The formula above states which entries contribute.';};
$('run').onclick=()=>run();$('reference').onclick=()=>run(false,'reference');$('suite').onclick=()=>run(true);
$('stop').onclick=()=>{const ex=active;clear('Stopped. Your code is preserved.');ex?.cancel();};$('retry').onclick=()=>active?.load().catch(()=>{});
$('reset').onclick=()=>{editor.setValue(starter(stage));drafts[stage]=editor.getValue();if(!isReference())clear('Rule reset. Run again to reveal its output.');};
$('download').onclick=()=>{const code=`# Rows, columns, coordinates\n${$('input-code').textContent}\n\n${editor.getValue()}\nprint(${stage==='center'?'center(X)':'project(C, V)'})\n`;const url=URL.createObjectURL(new Blob([code],{type:'text/x-python'})),a=node('a',{href:url,download:`pca_${stage}.py`});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('pagehide',()=>{student.dispose('Page closed');reference.dispose('Page closed');});renderStage();drawInputs();drawPlots();

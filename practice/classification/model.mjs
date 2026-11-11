export const config={"title": "Which mistakes does accuracy hide?", "function": "predict(scores, threshold)", "task": "Return one integer 0 or 1 per score. A score strictly greater than the threshold predicts class 1; equality predicts class 0. Scores are log-odds, and labels are the observed classes.", "hint": "Compare each score with the same threshold. Accuracy counts all matches; inspect which true class-1 cases are missed as well.", "starter": "def predict(scores, threshold):\n    \"\"\"Return a list of binary predictions, one per score.\"\"\"\n    raise NotImplementedError(\"Complete predict\")\n", "kind": "classification"};
export const cases=[{"id": "original", "name": "Original eight cases", "scores": [-1.2, 0.8, 2.1, -0.5, 1.5, -2, 0.3, 1.1], "labels": [0, 0, 1, 1, 1, 0, 1, 0]}, {"id": "boundary", "name": "At the decision boundary", "scores": [-0.1, 0, 0.1, 1, -1], "labels": [0, 1, 1, 0, 0]}, {"id": "imbalanced", "name": "Few positives", "scores": [-2, -1.8, -1.6, -1.4, -1.2, -1, -0.8, -0.6, -0.4, -0.2], "labels": [0, 0, 0, 0, 0, 0, 0, 0, 1, 1]}, {"id": "changed", "name": "Changed scores", "scores": [0.2, -0.3, 1.2, -1.4, 0.6, -0.1], "labels": [1, 0, 0, 1, 1, 0]}];
const fmt=x=>x===null?'undefined':Math.abs(x)>=10000||(x!==0&&Math.abs(x)<.001)?Number(x).toExponential(3):Number(x).toFixed(4).replace(/\.?0+$/,'');
function element(tag,parent,text,attributes={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const [k,v]of Object.entries(attributes))e.setAttribute(k,v);parent.append(e);return e;}
function svg(parent,description){const e=document.createElementNS('http://www.w3.org/2000/svg','svg');const w=Math.max(280,parent.getBoundingClientRect().width||document.getElementById('scene')?.getBoundingClientRect().width||280);e.setAttribute('viewBox',`0 0 ${w} 310`);e.setAttribute('role','img');e.setAttribute('aria-label',description);e.style.height='310px';parent.append(e);return {e,w,add:(tag,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;e.append(node);return node;}};}

export function niceTicks(lo,hi,target=4){const raw=(hi-lo)/target,power=10**Math.floor(Math.log10(raw)),ratio=raw/power,step=(ratio<=1?1:ratio<=2?2:ratio<=5?5:10)*power,out=[];for(let k=Math.ceil(lo/step);k*step<=hi+step*1e-9&&out.length<20;k++)out.push(Number((k*step).toPrecision(12)));return out;}
export function niceDomain(lo,hi){const pad=Math.max((hi-lo)*.12,.5),a=lo-pad,b=hi+pad,ticks=niceTicks(a,b),step=ticks.length>1?ticks[1]-ticks[0]:1;return [Math.floor(a/step)*step,Math.ceil(b/step)*step];}
export const transfer='Try the imbalanced case. Inspect where the scores sit relative to the threshold, then change the threshold and rerun your function.';
export const inputs=c=>`Scores: ${c.scores.join(', ')}. True labels: ${c.labels.join(', ')}.`;
export function render($,c,v,t,selection,inspect){
 const scene=$('scene');scene.replaceChildren();const picked=typeof selection==='object'?selection:{kind:'case',index:0};
 element('p',scene,`Threshold rule: score > ${t}. Circles are true class 0; squares are true class 1. The right column shows returned predictions.`);
 const {e,w,add}=svg(scene,'Each case on a common score axis, with true-label shapes, a threshold line, and returned predictions. Cases on the threshold are ringed; rings do not indicate correctness.');
 const height=70+c.scores.length*29;e.setAttribute('viewBox',`0 0 ${w} ${height}`);e.style.height=height+'px';
 const lo=Math.min(...c.scores,t)-.25,hi=Math.max(...c.scores,t)+.25,left=32,right=w-60,x=s=>left+(s-lo)/(hi-lo)*(right-left),bottom=height-35;
 add('text',{x:8,y:16},'Case');add('text',{x:w-46,y:16},'Return');
 add('line',{x1:x(t),x2:x(t),y1:24,y2:bottom,stroke:'#9a3d08','stroke-width':2,'stroke-dasharray':'5 4',class:'threshold-marker'});
 c.scores.forEach((score,i)=>{const cy=36+i*29,active=picked.kind==='case'&&picked.index===i;
  add('text',{x:9,y:cy+5},i+1);add('line',{x1:left,x2:right,y1:cy,y2:cy,stroke:'#e1e8ed'});
  const marker=c.labels[i]?add('rect',{x:x(score)-6,y:cy-6,width:12,height:12,fill:active?'#145c68':'white',stroke:'#145c68','stroke-width':2}):add('circle',{cx:x(score),cy,r:6,fill:active?'#145c68':'white',stroke:'#145c68','stroke-width':2});
  if(score===t)add('circle',{cx:x(score),cy,r:11,fill:'none',stroke:'#9a3d08','stroke-width':2,'stroke-dasharray':'3 2',class:'boundary-ring'});
  marker.setAttribute('data-focus',`case-${i}`);marker.setAttribute('tabindex','0');marker.setAttribute('role','button');marker.setAttribute('aria-label',`Inspect case ${i+1}: score ${score}, true class ${c.labels[i]}, returned ${v.predictions[i]}${score===t?', exactly on threshold':''}`);
  marker.addEventListener('click',()=>inspect({kind:'case',index:i}));marker.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspect({kind:'case',index:i});}});
  add('text',{x:w-30,y:cy+5,'text-anchor':'middle'},v.predictions[i]);
 });
 for(const tick of niceTicks(lo,hi,4))add('text',{x:x(tick),y:height-12,'text-anchor':'middle'},fmt(tick));
 element('p',scene,`Dashed marker: threshold ${t}. ${c.scores.filter(s=>s===t).length} case(s) sit exactly on it.`);
 const table=element('table',scene,undefined,{class:'confusion-matrix'}),head=element('thead',table),row=element('tr',head);
 element('th',row,'True class / returned',{scope:'col'});element('th',row,'Predicted 0',{scope:'col'});element('th',row,'Predicted 1',{scope:'col'});
 const body=element('tbody',table),names={TN:'True negative',FP:'False positive',FN:'False negative',TP:'True positive'};
 [['TN','FP'],['FN','TP']].forEach((keys,label)=>{const tr=element('tr',body);element('th',tr,`True ${label}`,{scope:'row'});keys.forEach(key=>{const td=element('td',tr),button=element('button',td,`${names[key]}: ${v.cells[key].length}`,{class:'secondary','data-focus':`cell-${key}`,'aria-pressed':String(picked.kind==='cell'&&picked.key===key)});button.onclick=()=>inspect({kind:'cell',key});});});
 let reading;
 if(picked.kind==='cell')reading=`${names[picked.key]}: ${v.cells[picked.key].map(i=>`case ${i+1}, score ${c.scores[i]}, true ${c.labels[i]}, returned ${v.predictions[i]}`).join('; ')||'no cases'}.`;
 else{const i=picked.index||0;reading=`Case ${i+1}: score ${c.scores[i]}, true class ${c.labels[i]}, returned ${v.predictions[i]}.${c.scores[i]===t?' This score is exactly on the threshold.':''}`;}
 element('p',scene,`Accuracy: ${fmt(100*v.accuracy)}%. Recall: ${v.recall===null?'undefined (no true class-1 cases)':fmt(100*v.recall)+'%'}. Recall is the share of true class-1 cases predicted as 1.`);
 $('reading').textContent=reading+` Accuracy ${fmt(100*v.accuracy)}%; recall ${v.recall===null?'undefined':fmt(100*v.recall)+'%'}.`;
}

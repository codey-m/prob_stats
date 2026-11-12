export const config={"title": "How unusual is this sample mean?", "function": "z_test(xbar, mu0, sigma, n)", "task": "Return (z, p) for a two-sided z-test with known population standard deviation sigma and sample size n. The supplied normal_cdf(z) returns the standard normal CDF; math is available.", "hint": "Standardize the difference using the standard deviation of the sample mean. A two-sided test includes both tails at least as far from zero as the observed statistic.", "starter": "def z_test(xbar, mu0, sigma, n):\n    \"\"\"Return the z-statistic and two-sided p-value.\"\"\"\n    raise NotImplementedError(\"Complete z_test\")\n", "kind": "ztest"};
export const cases=[{"id": "original", "name": "Original sample mean", "xbar": 10.1, "mu0": 10, "sigma": 0.2, "n": 25}, {"id": "negative", "name": "Equal difference below the null", "xbar": 9.9, "mu0": 10, "sigma": 0.2, "n": 25}, {"id": "larger", "name": "Four times the sample size", "xbar": 10.1, "mu0": 10, "sigma": 0.2, "n": 100}, {"id": "null", "name": "Sample mean equals the null", "xbar": 10, "mu0": 10, "sigma": 0.2, "n": 25}, {"id": "noise", "name": "Twice the population standard deviation", "xbar": 10.1, "mu0": 10, "sigma": 0.4, "n": 25}];
const fmt=x=>x===null?'undefined':Math.abs(x)>=10000||(x!==0&&Math.abs(x)<.001)?Number(x).toExponential(3):Number(x).toFixed(4).replace(/\.?0+$/,'');
function element(tag,parent,text,attributes={}){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;for(const [k,v]of Object.entries(attributes))e.setAttribute(k,v);parent.append(e);return e;}
function svg(parent,description){const e=document.createElementNS('http://www.w3.org/2000/svg','svg');const w=Math.max(280,parent.getBoundingClientRect().width||document.getElementById('scene')?.getBoundingClientRect().width||280);e.setAttribute('viewBox',`0 0 ${w} 310`);e.setAttribute('role','img');e.setAttribute('aria-label',description);e.style.height='310px';parent.append(e);return {e,w,add:(tag,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;e.append(node);return node;}};}

export function niceTicks(lo,hi,target=4){const raw=(hi-lo)/target,power=10**Math.floor(Math.log10(raw)),ratio=raw/power,step=(ratio<=1?1:ratio<=2?2:ratio<=5?5:10)*power,out=[];for(let k=Math.ceil(lo/step);k*step<=hi+step*1e-9&&out.length<20;k++)out.push(Number((k*step).toPrecision(12)));return out;}
export function niceDomain(lo,hi){const pad=Math.max((hi-lo)*.12,.5),a=lo-pad,b=hi+pad,ticks=niceTicks(a,b),step=ticks.length>1?ticks[1]-ticks[0]:1;return [Math.floor(a/step)*step,Math.ceil(b/step)*step];}
// Case chips name the transformation each preset applies to the base case.
const CHIPS={original:['Original','Original sample'],negative:['Mean below μ₀','Same gap, below the null'],larger:['4× the data','Four times the sample size'],null:['Mean = μ₀','Sample mean equals the null'],noise:['2× the noise','Twice the population SD']};
for(const c of cases){[c.chip,c.chipLabel]=CHIPS[c.id];}
export const transfer='';
export const inputs=c=>`x̄ = ${c.xbar} · μ₀ = ${c.mu0} · σ = ${c.sigma} · n = ${c.n}`;
export {fmt};
// Stable normal-tail probability via the regularized incomplete gamma at a=1/2.
// Series below x=1.5, continued fraction above; no extra browser library.
export function erfc(z){
 if(z<0)return 2-erfc(-z);if(z===0)return 1;const x=z*z,logFactor=-x+.5*Math.log(x)-Math.log(Math.sqrt(Math.PI));
 if(x<1.5){let ap=.5,sum=2,term=2;for(let n=1;n<200;n++){ap++;term*=x/ap;sum+=term;if(Math.abs(term)<Math.abs(sum)*1e-15)break;}return Math.max(0,1-sum*Math.exp(logFactor));}
 let b=x+.5,c=1e300,d=1/b,h=d;for(let i=1;i<200;i++){const an=-i*(i-.5);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-15)break;}return Math.exp(logFactor)*h;
}
// One rule vocabulary for the hand route and for describing Python output.
export const diffRules={signed:{label:'x̄ − μ₀',value:c=>c.xbar-c.mu0},absolute:{label:'|x̄ − μ₀|',value:c=>Math.abs(c.xbar-c.mu0)},reversed:{label:'μ₀ − x̄',value:c=>c.mu0-c.xbar}};
export const seRules={mean:{label:'σ / √n',value:c=>c.sigma/Math.sqrt(c.n)},individual:{label:'σ',value:c=>c.sigma},divideN:{label:'σ / n',value:c=>c.sigma/c.n}};
export const tailRules={both:{label:'both tails',count:2},one:{label:'one tail',count:1}};
const tail=z=>.5*erfc(Math.abs(z)/Math.SQRT2);
const near=(a,b,abs)=>Math.abs(a-b)<=Math.max(abs,.005*Math.abs(b));
export function parseEntry(text){const t=String(text).trim().replace(/^[−–]/,'-');if(!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t))return null;const v=Number(t);return Number.isFinite(v)?v:null;}
export function classifyDiff(c,v){const d=c.xbar-c.mu0;if(near(v,d,1e-6))return 'signed';if(d!==0&&near(v,-d,1e-6))return d<0?'absolute':'reversed';return null;}
export function classifySE(c,v){return Object.keys(seRules).find(k=>near(v,seRules[k].value(c),1e-9))||null;}
// Anchored messages: each names the mistake at its field without giving the value.
const DIFF_MSG={absolute:'Sign lost: x̄ is below μ₀.',reversed:'Reversed: subtract μ₀ from x̄.',none:'Not x̄ − μ₀ for this case.'};
const SE_MSG={individual:'σ is one observation’s spread, not x̄’s.',divideN:'σ / n shrinks too fast with n.',none:'Not the SD of x̄ for this case.'};
// Hand route: typed difference and SE, tails chosen on the curve (array of 'left'/'right').
export function handResult(c,diff,se,tails){
 const z=diff/se,p=tails.length*tail(z),dk=classifyDiff(c,diff),sk=classifySE(c,se);
 const anchored={diff:dk==='signed'?null:DIFF_MSG[dk||'none'],se:se<=0?'SE must be positive.':sk==='mean'?null:SE_MSG[sk||'none'],tails:tails.length===2?null:tails.length?'Two-sided: count both tails.':'Click the tails to count.'};
 return {values:{z,p,tail_area:2*tail(z),valid_p:true,standard_error:se,difference:diff,tails:[...tails]},anchored,issues:Object.values(anchored).filter(Boolean),suite:[],stdout:'',error:null};
}
// Rule-keyed form used by fixtures and by descriptions of Python output.
export function recipeValues(c,[d,s,t]){const z=diffRules[d].value(c)/seRules[s].value(c);return {z,p:tailRules[t].count*tail(z),tail_area:2*tail(z),valid_p:true};}
export function matchingRecipes(c,v){const same=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),out=[];for(const d of Object.keys(diffRules))for(const s of Object.keys(seRules))for(const t of Object.keys(tailRules)){const r=recipeValues(c,[d,s,t]);if(same(r.z,v.z)&&same(r.p,v.p))out.push(`(${diffRules[d].label}) / (${seRules[s].label}), ${tailRules[t].label}`);}return out;}

export function render($,c,v,t,selection,inspect,previous){
 previous=previous||v.previous||null;const choices=Array.isArray(v.tails);
 const scene=$('scene');scene.replaceChildren();const {w,add}=svg(scene,'Standard normal null density with boundaries at minus and plus absolute z, the z marker'+(choices?', and tail regions you can count.':'.'));
 const extent=Math.max(4,Math.min(8,Math.max(Math.abs(v.z),Math.abs(previous?.values.z||0))+.8)),left=40,right=w-24,x=a=>left+(a+extent)/(2*extent)*(right-left),y=b=>242-b/.42*207,phi=a=>Math.exp(-a*a/2)/Math.sqrt(2*Math.PI);
 const points=Array.from({length:401},(_,i)=>-extent+2*extent*i/400),bound=Math.abs(v.z);
 for(const sign of [-1,1]){const key=sign<0?'left':'right';if(choices&&!v.tails.includes(key))continue;const a=sign<0?-extent:Math.min(extent,bound),b=sign<0?Math.max(-extent,-bound):extent;if(a<b){const xs=Array.from({length:101},(_,i)=>a+(b-a)*i/100);add('path',{d:`M ${x(a)},242 `+xs.map(z=>`L ${x(z)},${y(phi(z))}`).join(' ')+` L ${x(b)},242 Z`,fill:'#e5c5a8',stroke:'#9a3d08','stroke-width':1,class:'tail-fill'});}}
 add('path',{d:points.map((z,i)=>`${i?'L':'M'}${x(z)},${y(phi(z))}`).join(' '),fill:'none',stroke:'#145c68','stroke-width':2.5});
 for(const boundary of new Set([-bound,bound]))if(Math.abs(boundary)<=extent)add('line',{x1:x(boundary),x2:x(boundary),y1:26,y2:242,stroke:'#9a3d08','stroke-width':2,'stroke-dasharray':'5 4',class:'tail-boundary'});
 if(bound<=extent)add('circle',{cx:x(v.z),cy:242,r:6,fill:'#182d3d',class:'signed-z'});
 if(previous&&Math.abs(previous.values.z)<=extent){add('line',{x1:x(previous.values.z),x2:x(previous.values.z),y1:35,y2:242,stroke:'#743884','stroke-width':2,'stroke-dasharray':'2 5',class:'comparison-z'});add('text',{x:x(previous.values.z),y:22,'text-anchor':'middle',fill:'#743884'},previous.case.chip);}
 for(const tick of niceTicks(-extent,extent,4))add('text',{x:x(tick),y:271,'text-anchor':'middle'},fmt(tick));add('text',{x:(left+right)/2,y:303,'text-anchor':'middle'},'z under the null');
 if(choices)for(const key of ['left','right']){
  // The whole region beyond the boundary is the control, so a tiny tail stays easy to hit.
  const edge=key==='left'?left:right,inner=Math.min(extent,bound),bx=key==='left'?x(-inner):x(inner),x0=key==='left'?edge:Math.min(bx,right-44),x1=key==='left'?Math.max(bx,left+44):edge,on=v.tails.includes(key);
  const r=add('rect',{x:x0,y:26,width:Math.max(0,x1-x0),height:216,fill:'transparent',class:'tail-hit'+(on?' on':''),role:'button',tabindex:0,'aria-pressed':String(on),'aria-label':`${key} tail beyond ${key==='left'?'minus':'plus'} absolute z`,'data-tail':key,'data-focus':'tail-'+key});
  add('text',{x:key==='left'?left+4:right-4,y:44,'text-anchor':key==='left'?'start':'end',class:'tail-label'+(on?' on':'')},(on?'✓ ':'+ ')+key);
 }
 const read=element('p',scene,'',{class:'readout'});element('span',read,`z = ${fmt(v.z)}`);element('span',read,`p = ${fmt(v.p)}`);
 if(!choices){const ok=Math.abs(v.tail_area-v.p)<1e-10;element('span',read,ok?'✓ p = two-tail area at z':`✗ p ≠ two-tail area at z (${fmt(v.tail_area)})`,{class:ok?'chip ok':'chip bad'});}
 element('p',scene,`┆ ±|z|   ● z${previous?`   ┆ ${previous.case.chip}: z = ${fmt(previous.values.z)}`:''}${bound>extent?'   z is off the plot':''}`,{class:'legend small'});
 $('reading').textContent=`z ${fmt(v.z)}, p ${fmt(v.p)}.`;
 const text=element('details',scene);element('summary',text,'Read as text');element('p',text,`Null distribution: standard normal. Boundaries at ${fmt(-bound)} and ${fmt(bound)}; each tail beyond them has probability ${fmt(v.tail_area/2)}.${choices?` Counted: ${v.tails.length?v.tails.join(' and '):'no'} tail${v.tails.length===1?'':'s'}.`:''}${previous?` Previous case ${previous.case.chipLabel}: z ${fmt(previous.values.z)}, p ${fmt(previous.values.p)}.`:''}`);
}

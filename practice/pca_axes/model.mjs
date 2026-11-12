export const CASES = [
 {id:'tilted-four',name:'Four observations, two features',X:[[2,8],[4,7],[6,13],[8,12]]},
 {id:'square',name:'Two observations, two features: a square array',X:[[2,9],[6,3]]},
 {id:'negative-five',name:'Five observations with a negative association',X:[[-4,9],[-1,6],[0,7],[3,2],[7,-1]]}
];
export const STAGES={
 center:{fn:'center',title:'Center each feature',task:'X has shape (N, 2). Row i is an observation; column j is a feature. Subtract each feature’s mean from that feature. Return C with shape (N, 2).',formula:'C[i, j] = X[i, j] − (1/N) Σᵣ X[r, j]',hand:'Find C[0, 1]. Select the entries of X used to compute the mean subtracted from X[0, 1]. Then calculate C[0, 1].',interface:'Define center(X). X is a NumPy array; np is available. Return a new array and leave X unchanged.',hint:'There is one mean per feature. Compare the number of means with the dimension along which NumPy aligns them when subtracting.',transfer:'Try the square table by either route: apply a selection to every entry, or run a NumPy rule. Can a wrong-axis rule return the requested shape and still move the wrong numbers?'},
 project:{fn:'project',title:'Project one observation',task:'C is already centered correctly, independently of your previous function. It has shape (N, 2). V has shape (2, 2), with one PCA direction in each column. Return Z with shape (N, 2), one row per observation.',formula:'Z[i, k] = Σⱼ C[i, j] V[j, k]',hand:'Find Z[0, 1], observation 0 on PC2. Select the entries of C and V that contribute to this dot product. Then calculate Z[0, 1].',interface:'Define project(C, V). Both are NumPy arrays; np is available. Leave both inputs unchanged. Each column of V is a direction.',hint:'One output entry combines one observation with one direction. Track the feature index through the two inputs and ask which index disappears in the sum.',transfer:'Both V and its transpose have shape (2, 2). By hand or in NumPy, does a compatible multiplication guarantee that you used the direction stored in each column?'}
};
// Authored MathML only. Every index is linked to the array notation in the brief.
const math=(body,label)=>`<math display="block" displaystyle="true" aria-label="${label}"><mrow>${body}</mrow></math>`;
const sub=(base,indices)=>`<msub><mi>${base}</mi><mrow>${[...indices].map(i=>`<mi>${i}</mi>`).join('')}</mrow></msub>`;
STAGES.center.math=math(`${sub('μ','j')}<mo>=</mo><mfrac><mn>1</mn><mi>N</mi></mfrac><munderover><mo largeop="true" movablelimits="false">∑</mo><mrow><mi>r</mi><mo>=</mo><mn>0</mn></mrow><mrow><mi>N</mi><mo>−</mo><mn>1</mn></mrow></munderover>${sub('X','rj')}`,'Mean for feature j equals one over N times the sum of X r j over observations r from zero through N minus one')+math(`${sub('C','ij')}<mo>=</mo>${sub('X','ij')}<mo>−</mo>${sub('μ','j')}`,'Centered entry C i j equals X i j minus the mean for feature j');
STAGES.project.math=math(`${sub('Z','ik')}<mo>=</mo><munderover><mo largeop="true" movablelimits="false">∑</mo><mrow><mi>j</mi><mo>=</mo><mn>0</mn></mrow><mn>1</mn></munderover>${sub('C','ij')}${sub('V','jk')}`,'Coordinate Z i k equals the sum over features j from zero through one of C i j times V j k');
export const starter=stage=>stage==='center'?`def center(X):
    # Return the feature-centered array.
    raise NotImplementedError("Complete center.")
`:`def project(C, V):
    # Return the coordinates along the supplied directions.
    raise NotImplementedError("Complete project.")
`;
export const fmt=x=>Math.abs(x)<1e-9?'0':Number(x).toLocaleString('en-US',{maximumFractionDigits:3});
export function inputs(c){
 const n=c.X.length,m=[0,1].map(j=>c.X.reduce((s,r)=>s+r[j],0)/n),C=c.X.map(r=>r.map((x,j)=>x-m[j]));
 const a=C.reduce((s,r)=>s+r[0]*r[0],0),b=C.reduce((s,r)=>s+r[0]*r[1],0),d=C.reduce((s,r)=>s+r[1]*r[1],0);
 const t=.5*Math.atan2(2*b,a-d),u=Math.cos(t),v=Math.sin(t);
 return {C,V:[[u,-v],[v,u]]};
}
// One vocabulary for both routes. Each named rule gives the entries it uses for one output entry
// (what a learner selects by hand) and the whole output it produces (what NumPy would return).
// Code feedback, hand feedback and inspection all read from this table, so the routes name the same rules.
const keyList=(name,pairs)=>pairs.map(([i,j])=>`${name}:${i}:${j}`);
const rowMean=r=>(r[0]+r[1])/2;
const matmul=(A,B)=>A.map(r=>[0,1].map(k=>r[0]*B[0][k]+r[1]*B[1][k]));
export const RULES={
 center:{
  column:{correct:true,hand:'each feature’s own mean, taken down its column',code:'The returned values subtract a separate mean for each feature.',support:(c,i,j)=>keyList('X',c.X.map((_,r)=>[r,j])),apply:c=>inputs(c).C},
  row:{hand:'one observation’s row mean, averaging across features within a row',code:'The returned values subtract each observation’s row mean from that row.',support:(c,i)=>keyList('X',[[i,0],[i,1]]),apply:c=>c.X.map(r=>r.map(x=>x-rowMean(r)))},
  global:{hand:'one mean for the entire table',code:'The returned values subtract one mean for the entire table.',support:c=>c.X.flatMap((_,r)=>keyList('X',[[r,0],[r,1]])),apply:c=>{const m=c.X.flat().reduce((s,x)=>s+x,0)/(2*c.X.length);return c.X.map(r=>r.map(x=>x-m));}},
  'row-on-columns':{square:true,hand:'the mean of row j subtracted down column j, which is what row means do when NumPy lines them up with the columns',code:'The returned values subtract row means along the columns. This square array lets the operation run without a shape error.',support:(c,i,j)=>keyList('X',[[j,0],[j,1]]),apply:c=>{const m=c.X.map(rowMean);return c.X.map(r=>r.map((x,j)=>x-m[j]));}},
  unchanged:{hand:'no mean at all',code:'The returned values equal the supplied input.',support:()=>[],apply:c=>c.X.map(r=>r.slice())}
 },
 project:{
  columns:{correct:true,hand:'one observation paired with one direction, a column of V',code:'The returned values are dot products with the columns of V.',support:(c,i,k)=>[...keyList('C',[[i,0],[i,1]]),...keyList('V',[[0,k],[1,k]])],apply:c=>{const {C,V}=inputs(c);return matmul(C,V);}},
  transposed:{hand:'one observation paired with a row of V instead of a column',code:'The returned values are dot products with the rows of V. Both multiplications have compatible shapes.',support:(c,i,k)=>[...keyList('C',[[i,0],[i,1]]),...keyList('V',[[k,0],[k,1]])],apply:c=>{const {C,V}=inputs(c);return matmul(C,[0,1].map(j=>V.map(r=>r[j])));}},
  elementwise:{square:true,hand:'one entry of C times the entry of V in the same position, with no sum over features',code:'The returned values are entry-by-entry products of C and V; no feature contributions were summed.',support:(c,i,k)=>[`C:${i}:${k}`,`V:${i}:${k}`],apply:c=>{const {C,V}=inputs(c);return C.map((r,i)=>r.map((x,k)=>x*V[i][k]));}},
  unchanged:{hand:'the entry of C alone, with no direction',code:'The returned values equal the supplied input.',support:(c,i,k)=>[`C:${i}:${k}`],apply:c=>inputs(c).C.map(r=>r.slice())}
 }
};
export const CORRECT={center:'column',project:'columns'};
// The hand target is always output entry [0, 1].
export const ruleForSelection=(stage,c,selection)=>Object.entries(RULES[stage]).find(([,r])=>{const s=r.support(c,0,1);return s.length>0&&s.length===selection.size&&s.every(k=>selection.has(k));})?.[0]??null;
// Rules marked square only broadcast when N = 2; on other tables NumPy raises a shape error.
export const runsOn=(rule,c)=>!rule.square||c.X.length===2;
export const cellNames=keys=>keys.map(k=>{const [n,i,j]=k.split(':');return `${n}[${i}, ${j}]`;}).join(', ');

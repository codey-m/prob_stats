export const CASES = [{"id": "six", "name": "Six observations", "x": [0, 1, 3, 0, 1, 3], "g": [0, 0, 0, 1, 1, 1], "y": [1.5, 2.8, 4.5, 3, 5.2, 9.5], "beta": [1, 1, 2, 1]}, {"id": "five", "name": "Five observations, changed coefficients", "x": [-2, 0, 2, -1, 3], "g": [1, 0, 1, 0, 0], "y": [2.5, -0.5, 0.2, -1, 1.2], "beta": [-1, 0.5, 3, -1]}, {"id": "square", "name": "Four observations: square design matrix", "x": [-1, 2, 0, 3], "g": [0, 1, 1, 0], "y": [-1, 3, 0, 5], "beta": [0.5, 1.5, -1, 0.5]}, {"id": "check", "name": "Check table: 40 observations", "check": true, "x": [0, 0, 0, -1, 0, 3, 5, 5, -2, 5, 2, 3, -3, 1, -2, 5, 3, 1, -1, 5, 4, -1, -2, 0, 5, 5, 2, 3, 0, 2, 2, -2, -3, 2, -1, 4, -1, 2, 3, 1], "g": [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0], "y": [0.8, -0.8, 2.0, -0.3, 0.8, 5.8, 4.2, 7.9, 1.6, 8.8, 1.8, 5.8, 1.1, 1.5, -0.6, 8.5, 3.4, 1.1, 0.8, 8.1, 6.6, 2.1, -2.5, 1.6, 7.9, 7.7, 4.6, 8.2, 0.1, 3.2, 2.7, 0.9, -0.5, 4.8, 0.1, 4.4, -0.1, 3.2, 6.1, 2.9], "beta": [1.5, 0.5, -1, 1.2]}];
export const STAGES={
 design:{purpose:'foundation',title:'Build a row, then predict',task:'Each design row is [1, x, g, xg], in that order. X has shape (N, 4); beta has shape (4,). Use the supplied coefficients to predict one value per observation.',interface:'Define design(x, group). Both inputs are NumPy vectors with shape (N,). Return X with shape (N, 4), with columns 1, x, group, and x*group. np is available. Leave both inputs unchanged.',hint:'There is one observation per row and one model term per column. The product term is active only for group B.',transfer:'Change to the four-observation table. A transposed design matrix now has the requested shape. Does it still put one observation in each row?'},
 residual:{purpose:'bug',title:'Match each observation to its prediction',task:'The supplied predictions are already correct, independently of your design function. y has shape (N,), while predicted has shape (N, 1). Return one observed-minus-predicted residual per observation, with shape (N,).',interface:'Define residuals(y, predicted). y is a NumPy vector with shape (N,); predicted is a NumPy column array with shape (N, 1). Return a vector with shape (N,), and leave both inputs unchanged. np is available.',hint:'A row index and a column index identify different dimensions. Follow which observation each value belongs to before subtracting.',transfer:'If a subtraction produces N squared numbers, which observation and prediction does each entry compare?'}
};
export const starter=stage=>stage==='design'?`def design(x, group):
    # Return one row of model terms per observation.
    raise NotImplementedError("Build the design matrix.")
`:`def residuals(y, predicted):
    # Return one residual per observation.
    raise NotImplementedError("Match each observation to its prediction.")
`;
export function prepared(c){const X=c.x.map((x,i)=>[1,x,c.g[i],x*c.g[i]]),pred=X.map(row=>row.reduce((s,v,j)=>s+v*c.beta[j],0));return {X,pred,residual:c.y.map((y,i)=>y-pred[i])};}
export const fmt=x=>Math.abs(x)<1e-9?'0':Math.abs(x)>=10000?x.toExponential(1):Number(x).toLocaleString('en-US',{maximumFractionDigits:2});
export const TERMS=['1','x','g','xg','0','x+g'];
export const term=(name,x,g)=>({'1':1,x,g,xg:x*g,'0':0,'x+g':x+g})[name];
export const RECIPES={specified:{terms:['1','x','g','xg'],layout:'rows'},'swapped-x-group':{terms:['1','g','x','xg'],layout:'rows'},additive:{terms:['1','x','g','0'],layout:'rows'},'sum-interaction':{terms:['1','x','g','x+g'],layout:'rows'},transposed:{terms:['1','x','g','xg'],layout:'columns'}};
export const OPERATIONS={specified:'Columns [1, x, g, xg]; one observation per row.','swapped-x-group':'Columns [1, g, x, xg]; the x and group columns are exchanged.',additive:'Columns [1, x, g, 0]; the groups share one slope.','sum-interaction':'Columns [1, x, g, x + g]; the last term adds x and g.',transposed:'The four term vectors are the rows of the array.',matched:'One observed-minus-predicted residual per observation.',reversed:'One predicted-minus-observed residual per observation.',broadcast:'Every observed value is compared with every prediction.',column:'Matched observed-minus-predicted residuals are stored as a column array.'};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// The hand route has no separate expression choice: the column order is stated, and the learner's entered row
// is the evidence of the rule they applied. These are the named row rules that produce that row for observation i.
export const ROW_RULES=['specified','swapped-x-group','additive','sum-interaction'];
export const rowRules=(c,i,row)=>row.every(Number.isFinite)?ROW_RULES.filter(k=>RECIPES[k].terms.every((t,j)=>Math.abs(term(t,c.x[i],c.g[i])-row[j])<=1e-8*(1+Math.abs(row[j])))):[];
// A group B observation with x other than 0 or 1 gives four different rows, so every rule is distinguishable there.
export const telling=c=>{for(let i=c.x.length-1;i>=0;i--)if(c.g[i]===1&&c.x[i]!==0&&c.x[i]!==1)return i;return c.x.length-1;};
export function choiceResult(c,stage,choices){
 const p=prepared(c),n=c.x.length,r={values:null,shape:null,required_shape:stage==='design'?[n,4]:[n],passed:false,mutated:false,error:null,stdout:'',pattern:null,wrong:null,predictions:null,residuals:null};
 if(stage==='design'){
  if(!choices.terms?.every(t=>TERMS.includes(t)))throw Error('Enter a row that follows one column rule first.');
  const rows=c.x.map((x,i)=>choices.terms.map(t=>term(t,x,c.g[i])));
  r.values=choices.layout==='columns'?choices.terms.map((_,j)=>rows.map(row=>row[j])):rows;
  r.shape=[r.values.length,r.values[0].length];
  for(const[name,recipe]of Object.entries(RECIPES)){
   const rr=c.x.map((x,i)=>recipe.terms.map(t=>term(t,x,c.g[i]))),v=recipe.layout==='columns'?recipe.terms.map((_,j)=>rr.map(row=>row[j])):rr;
   if(same(r.values,v)){r.pattern=name;break;}
  }
 }else{
  const key=choices.pairing;if(!['matched','reversed','broadcast','column'].includes(key))throw Error('Choose a residual operation.');
  r.values=key==='broadcast'?p.pred.map(pred=>c.y.map(y=>y-pred)):key==='reversed'?p.residual.map(v=>-v):key==='column'?p.residual.map(v=>[v]):p.residual.slice();
  r.shape=key==='broadcast'?[n,n]:key==='column'?[n,1]:[n];r.pattern=key;
 }
 if(!same(r.shape,r.required_shape)){r.error=`Returned shape (${r.shape.join(', ')}); required shape (${r.required_shape.join(', ')}).`;return r;}
 const actual=r.values.flat(),expected=(stage==='design'?p.X:p.residual).flat();r.wrong=actual.filter((v,i)=>Math.abs(v-expected[i])>1e-8).length;r.passed=r.wrong===0;
 if(stage==='design'){r.predictions=r.values.map(row=>row.reduce((s,v,j)=>s+v*c.beta[j],0));r.residuals=c.y.map((y,i)=>y-r.predictions[i]);}
 return r;
}
const sub=(a,b)=>`<msub><mi>${a}</mi><mrow>${[...b].map(i=>`<mi>${i}</mi>`).join('')}</mrow></msub>`;
const math=(body,label)=>`<math display="block" displaystyle="true" aria-label="${label}"><mrow>${body}</mrow></math>`;
STAGES.design.math=math(`${sub('X','i')}<mo>=</mo><mo>[</mo><mn>1</mn><mo>,</mo>${sub('x','i')}<mo>,</mo>${sub('g','i')}<mo>,</mo>${sub('x','i')}${sub('g','i')}<mo>]</mo>`,'Row i of X contains one, x i, g i, and x i times g i')+math(`<msub><mover><mi>y</mi><mo>^</mo></mover><mi>i</mi></msub><mo>=</mo><munderover><mo largeop="true" movablelimits="false">∑</mo><mrow><mi>j</mi><mo>=</mo><mn>0</mn></mrow><mn>3</mn></munderover>${sub('X','ij')}${sub('β','j')}`,'Predicted y i equals the sum over columns j from zero through three of X i j times beta j');
STAGES.residual.math=math(`${sub('r','i')}<mo>=</mo>${sub('y','i')}<mo>−</mo><msub><mover><mi>y</mi><mo>^</mo></mover><mi>i</mi></msub>`,'Residual i equals observed y i minus predicted y i');

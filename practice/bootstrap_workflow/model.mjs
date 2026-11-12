export const CASES = [{"id": "paired-four", "name": "Four paired observations", "rows": [[1, 3], [2, 8], [4, 6], [7, 14]], "draws": [[0, 0, 2, 3], [3, 3, 3, 3], [3, 2, 1, 0], [0, 3, 3, 1], [0, 0, 0, 0], [1, 1, 0, 3], [2, 3, 1, 1], [2, 3, 0, 0], [3, 2, 3, 0], [2, 2, 1, 2], [0, 0, 0, 3], [0, 2, 3, 0]]}, {"id": "negative-five", "name": "Five paired observations", "rows": [[0, 12], [2, 9], [5, 8], [8, 1], [10, 3]], "draws": [[0, 0, 2, 3, 4], [4, 4, 4, 4, 4], [3, 0, 0, 0, 3], [1, 2, 0, 3, 2], [4, 4, 3, 1, 3], [1, 1, 3, 3, 4], [4, 1, 4, 3, 2], [2, 4, 1, 3, 3], [4, 1, 2, 2, 4], [3, 3, 4, 0, 2], [1, 2, 1, 2, 0], [4, 3, 1, 3, 3]]}, {"id": "three", "name": "Three paired observations", "rows": [[1, 4], [3, 9], [6, 2]], "draws": [[0, 0, 2], [2, 2, 2], [2, 1, 2], [1, 1, 2], [2, 0, 0], [2, 0, 1], [0, 0, 2], [1, 0, 1], [2, 2, 2], [2, 0, 0], [2, 0, 1], [1, 2, 0]]}];
export const STARTER = `def bootstrap(rows, draw_plan, statistic):
    results = []
    for indices in draw_plan:
        # Build this sample and record its statistic.
        raise NotImplementedError("Complete one replicate.")
    return results
`;
export const fmt=x=>Math.abs(x)<1e-9?'0':Math.abs(x)>=10000?x.toExponential(1):Number(x).toLocaleString('en-US',{maximumFractionDigits:3});
export const cov=sample=>{const n=sample.length,mx=sample.reduce((s,r)=>s+r[0],0)/n,my=sample.reduce((s,r)=>s+r[1],0)/n;return sample.reduce((s,r)=>s+(r[0]-mx)*(r[1]-my),0)/(n-1);};
export function oracle(sample){let sum=0;for(let i=0;i<sample.length;i++)for(let j=0;j<i;j++)sum+=(sample[i][0]-sample[j][0])*(sample[i][1]-sample[j][1]);return sum/(sample.length*(sample.length-1));}
const close=(a,b)=>Math.abs(a-b)<=1e-8+1e-8*Math.abs(b);
export function workflow(c,{sample:sampleRule,stat:statRule,store:storeRule}){
 if(!['rows','shift'].includes(sampleRule)||!['sample','original'].includes(statRule)||!['scalar','rows'].includes(storeRule))throw Error('Choose a rule for each of the three steps.');
 const records=c.draws.map(indices=>{
  const wanted=indices.map(i=>c.rows[i].slice());
  const sample=indices.map((i,k)=>[c.rows[i][0],c.rows[sampleRule==='rows'?i:indices[(k+1)%indices.length]][1]]);
  const computed=cov(statRule==='sample'?sample:c.rows),value=storeRule==='scalar'?computed:null;
  return {sample,value,computed,stored:JSON.stringify(storeRule==='scalar'?computed:sample),sample_ok:JSON.stringify(sample)===JSON.stringify(wanted),value_ok:value!==null&&close(value,oracle(sample)),intended_value_ok:value!==null&&close(value,oracle(wanted)),error:value===null?'The stored item is not one finite numeric statistic.':null};
 });
 return {records,count_ok:true,passed:records.every(r=>r.sample_ok&&r.value_ok&&!r.error),mutated:false,error:null,stdout:''};
}
export const FORMULA=`<math display="block" displaystyle="true" aria-label="Sample covariance equals one over n minus one times the sum over sampled rows of x minus its sample mean times y minus its sample mean"><mrow><msub><mi>s</mi><mrow><mi>x</mi><mi>y</mi></mrow></msub><mo>=</mo><mfrac><mn>1</mn><mrow><mi>n</mi><mo>−</mo><mn>1</mn></mrow></mfrac><munderover><mo largeop="true" movablelimits="false">∑</mo><mrow><mi>i</mi><mo>=</mo><mn>0</mn></mrow><mrow><mi>n</mi><mo>−</mo><mn>1</mn></mrow></munderover><mo>(</mo><msub><mi>x</mi><mi>i</mi></msub><mo>−</mo><mover><mi>x</mi><mo>¯</mo></mover><mo>)</mo><mo>(</mo><msub><mi>y</mi><mi>i</mi></msub><mo>−</mo><mover><mi>y</mi><mo>¯</mo></mover><mo>)</mo></mrow></math>`;

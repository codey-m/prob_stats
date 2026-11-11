export const cases=[
 {id:'original',name:'Four observations',mean:0,variance:1,noise:4,observations:[3,5,4,6]},
 {id:'strong-prior',name:'More precise prior',mean:0,variance:.25,noise:4,observations:[3,5,4,6]},
 {id:'precise-data',name:'More precise observations',mean:0,variance:1,noise:.25,observations:[3,5,4,6]},
 {id:'opposing',name:'Observations below the prior',mean:4,variance:2,noise:1,observations:[-3,-1,0]},
 {id:'equal',name:'Equal information, one observation',mean:2,variance:4,noise:4,observations:[10]},
];
export const starter=`def update_normal_normal(prior_mean, prior_var, obs, lik_var):
    """Return posterior mean and variance after one observation."""
    raise NotImplementedError("Complete the update")
`;
export const density=(x,mean,variance)=>Math.exp(-.5*((x-mean)/Math.sqrt(variance))**2)/(Math.sqrt(2*Math.PI)*Math.sqrt(variance));
export function domain(c){return [Math.min(c.mean-4*Math.sqrt(c.variance),...c.observations.map(x=>x-4*Math.sqrt(c.noise))),Math.max(c.mean+4*Math.sqrt(c.variance),...c.observations.map(x=>x+4*Math.sqrt(c.noise)))];}
export const precisionShare=(priorVar,noise)=>priorVar/(priorVar+noise);
export function indent(text,start,end){const beginning=text.lastIndexOf('\n',start-1)+1;if(start===end)return {text:text.slice(0,start)+'    '+text.slice(end),start:start+4,end:start+4};const block=text.slice(beginning,end),out=block.split('\n').map(line=>'    '+line).join('\n');return {text:text.slice(0,beginning)+out+text.slice(end),start:start+4,end:end+out.length-block.length};}

export const cases = [
 {id:'five',name:'Five observations',data:[4,8,10,12,16]},
 {id:'wide',name:'Same size, wider spread',data:[-2,6,10,14,22]},
 {id:'ten',name:'Same distribution, n = 10',data:[4,8,10,12,16,4,8,10,12,16]},
 {id:'tiny',name:'Two observations',data:[0,2]},
];
export const starter = `def resample(data, rng):
    """Return one resample with the same number of observations."""
    raise NotImplementedError("Complete resample")
`;
export function histogram(values, lo, hi, bins=24){
 const counts=Array(bins).fill(0), width=(hi-lo)/bins;
 for(const value of values) counts[Math.max(0,Math.min(bins-1,Math.floor((value-lo)/width)))]++;
 return counts;
}
export function sd(values){const mean=values.reduce((a,b)=>a+b,0)/values.length;return Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length);}

// Returned values identify value groups, not individual duplicate source records.
export function valueGroups(data){return [...new Set(data)].map(value=>({value,count:data.filter(x=>x===value).length}));}
export function nextStep(state,n,total){
 if(state.phase==='select'&&state.picks<n)return {...state,picks:state.picks+1};
 if(state.phase==='select')return {...state,phase:'mean'};
 if(state.phase==='mean')return {...state,phase:'bin'};
 return state.frame<total?{frame:state.frame+1,picks:0,phase:'select'}:state;
}
export function indentSelection(text,start,end){
 const lineStart=text.lastIndexOf('\n',start-1)+1;
 if(start===end)return {text:text.slice(0,start)+'    '+text.slice(end),start:start+4,end:start+4};
 const block=text.slice(lineStart,end),replacement=block.split('\n').map(line=>'    '+line).join('\n');
 return {text:text.slice(0,lineStart)+replacement+text.slice(end),start:start+4,end:end+replacement.length-block.length};
}

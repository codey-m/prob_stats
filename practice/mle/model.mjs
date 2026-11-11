export const cases=[
 {id:'original',name:'Five waiting times',data:[2,4,4,5,5]},
 {id:'longer',name:'Every waiting time doubled',data:[4,8,8,10,10]},
 {id:'shorter',name:'Every waiting time halved',data:[1,2,2,2.5,2.5]},
 {id:'repeated',name:'Twice as many, same empirical distribution',data:[2,4,4,5,5,2,4,4,5,5]},
 {id:'zero',name:'Includes a zero waiting time',data:[0,1,2,3]},
];
export const starter=`import math

def loglik(theta, data):
    """Return exponential log-likelihood, using a rate theta."""
    raise NotImplementedError("Complete loglik")

def mle(data):
    """Return the rate that maximizes the log-likelihood."""
    raise NotImplementedError("Complete mle")
`;
export function segments(points){const groups=[];let group=[];for(const p of points){if(p[1]===null){if(group.length)groups.push(group);group=[];}else group.push(p);}if(group.length)groups.push(group);return groups;}
export function indent(text,start,end){const beginning=text.lastIndexOf('\n',start-1)+1;if(start===end)return {text:text.slice(0,start)+'    '+text.slice(end),start:start+4,end:start+4};const block=text.slice(beginning,end),out=block.split('\n').map(line=>'    '+line).join('\n');return {text:text.slice(0,beginning)+out+text.slice(end),start:start+4,end:end+out.length-block.length};}

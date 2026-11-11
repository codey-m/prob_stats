"""Exponential rate MLE: actual student curve and estimate; independent checks."""
import contextlib
import io
import json
import math
import numbers
import traceback

CASES=[
    dict(id='original',name='Five waiting times',data=[2,4,4,5,5]),
    dict(id='longer',name='Every waiting time doubled',data=[4,8,8,10,10]),
    dict(id='shorter',name='Every waiting time halved',data=[1,2,2,2.5,2.5]),
    dict(id='repeated',name='Twice as many, same empirical distribution',data=[2,4,4,5,5,2,4,4,5,5]),
    dict(id='zero',name='Includes a zero waiting time',data=[0,1,2,3]),
]
REFERENCE='''import math
def loglik(theta, data):
    if theta <= 0:
        return -math.inf
    return len(data)*math.log(theta)-theta*sum(data)
def mle(data):
    return len(data)/sum(data)
'''

class BoundedOutput(io.TextIOBase):
    def __init__(self):
        self.parts,self.remaining,self.truncated=[],2000,False
    def write(self,text):
        text=str(text)
        if self.remaining:self.parts.append(text[:self.remaining])
        self.truncated |= len(text)>self.remaining
        self.remaining=max(0,self.remaining-len(text))
        return len(text)
    def getvalue(self):
        return ''.join(self.parts)+ ('\n[Output limited to 2,000 characters.]' if self.truncated else '')

def finite(x):
    return not isinstance(x,bool) and isinstance(x,numbers.Real) and math.isfinite(x)

def error_text(exc, code=""):
    frames=[f for f in traceback.extract_tb(exc.__traceback__) if f.filename=='your_function.py']
    message=('Your function, line '+str(frames[-1].lineno)+': '+(code.splitlines()[frames[-1].lineno-1].strip()[:200] if code else '')+'\n' if frames else '')+''.join(traceback.format_exception_only(type(exc),exc))
    return message[:1800]+ ('\n[Error shortened.]' if len(message)>1800 else '')

def validate_data(data):
    if not isinstance(data,list) or not 1<=len(data)<=20 or any(not finite(x) or not 0<=x<=100 for x in data) or sum(data)<=0:
        raise ValueError('Use 1 to 20 finite, nonnegative observations, at most 100 each, with a positive total.')

def call(function,theta,data):
    supplied=list(data)
    value=function(theta,supplied)
    if supplied!=data:raise ValueError('Keep the supplied data unchanged.')
    if not finite(value):raise ValueError('loglik must return a finite number for positive theta.')
    return float(value)

def estimate(function,data):
    supplied=list(data);value=function(supplied)
    if supplied!=data:raise ValueError('Keep the supplied data unchanged.')
    if not finite(value) or value<=0:raise ValueError('mle must return a finite, strictly positive rate.')
    return float(value)

def exact(theta,data):
    # Independent sum of individual log densities rather than n*log(theta)-theta*sum.
    return math.fsum(math.log(theta)-theta*x for x in data)

def check(functions,data,code=""):
    loglik,mle=functions
    rate=1/(math.fsum(data)/len(data))
    issues=[]
    try:
        found=estimate(mle,data)
        if not math.isclose(found,rate,rel_tol=1e-8,abs_tol=1e-10):issues.append('Returned rate differs from the independent estimate check.')
    except BaseException as exc:issues.append(error_text(exc,code))
    try:
        for theta in [rate*.25,rate,rate*2]:
            if not math.isclose(call(loglik,theta,data),exact(theta,data),rel_tol=1e-8,abs_tol=1e-10):
                issues.append('Log-likelihood differs from the sum of individual log densities.');break
        for theta in [0,-1]:
            supplied=list(data)
            try:
                value=loglik(theta,supplied)
                if supplied!=data or isinstance(value,bool) or not isinstance(value,numbers.Real) or value!=-math.inf:
                    issues.append('For theta <= 0, return negative infinity or raise ValueError.');break
            except ValueError:
                if supplied!=data:issues.append('Keep the supplied data unchanged.')
    except BaseException as exc:issues.append(error_text(exc,code))
    return issues

def evaluate_request(request):
    result=dict(points=[],estimate=None,estimate_value=None,neighbors=[[None,None],[None,None]],error=None,stdout='',issues=[],suite=[])
    output=BoundedOutput()
    code=""
    try:
        data=request['data'];validate_data(data)
        mode=request.get('mode','student')
        if mode not in ('student','reference'):raise ValueError('Unknown run mode.')
        code=REFERENCE if mode=='reference' else request.get('code')
        if not isinstance(code,str) or len(code)>16000:raise ValueError('Code is limited to 16,000 characters.')
        namespace={'__name__':'__student__'}
        with contextlib.redirect_stdout(output),contextlib.redirect_stderr(output):
            exec(compile(code,'your_function.py','exec'),namespace)
            functions=(namespace.get('loglik'),namespace.get('mle'))
            if not all(callable(f) for f in functions):raise TypeError('Define both loglik(theta, data) and mle(data).')
            rate=len(data)/sum(data);lo,hi=.1*rate,2.5*rate
            if not finite(hi) or lo<=0:raise ValueError('The waiting-time total is too small for a finite plotted rate range.')
            failures=[]
            for i in range(121):
                theta=lo+(hi-lo)*i/120
                try:result['points'].append([theta,call(functions[0],theta,data)])
                except BaseException as exc:
                    result['points'].append([theta,None])
                    if len(failures)<3:failures.append('Curve theta '+format(theta,'.4g')+': '+error_text(exc,code))
            if failures:result['error']='\n'.join(failures)
            try:
                result['estimate']=estimate(functions[1],data)
                result['estimate_value']=call(functions[0],result['estimate'],data)
                for index,factor in enumerate([.8,1.2]):
                    theta=result['estimate']*factor
                    if finite(theta) and theta>0:
                        try:result['neighbors'][index]=[theta,call(functions[0],theta,data)]
                        except BaseException:pass
            except BaseException as exc:result['error']=(result['error']+'\n' if result['error'] else '')+'Estimate: '+error_text(exc,code)
            result['issues']=check(functions,data,code)
            if request.get('suite'):
                for case in CASES:
                    try:
                        fresh={'__name__':'__student__'};exec(compile(code,'your_function.py','exec'),fresh)
                        issues=check((fresh['loglik'],fresh['mle']),case['data'],code)
                        result['suite'].append(dict(name=case['name'],passed=not issues,issues=issues))
                    except BaseException as exc:result['suite'].append(dict(name=case['name'],passed=False,issues=[error_text(exc,code)]))
    except BaseException as exc:result['error']=error_text(exc,code)
    result['stdout']=output.getvalue()
    return result

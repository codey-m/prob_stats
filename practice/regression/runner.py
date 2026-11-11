"""Directly authored regression practice runner; no course wiring."""
import contextlib
import io
import json
import math
import numbers
import traceback

class BoundedOutput(io.TextIOBase):
    def __init__(self):
        self.parts, self.remaining, self.truncated = [], 2000, False
    def write(self, text):
        text = str(text)
        if self.remaining:
            self.parts.append(text[:self.remaining])
        self.truncated |= len(text) > self.remaining
        self.remaining = max(0, self.remaining - len(text))
        return len(text)
    def getvalue(self):
        return ''.join(self.parts) + ('\n[Output limited to 2,000 characters.]' if self.truncated else '')


def finite(value):
    return not isinstance(value, bool) and isinstance(value, numbers.Real) and math.isfinite(value)


def error_text(exc, code=""):
    frames=[f for f in traceback.extract_tb(exc.__traceback__) if f.filename=='your_function.py']
    prefix=''
    if frames and not isinstance(exc,SyntaxError):
        n=frames[-1].lineno
        source=code.splitlines()[n-1].strip()[:200] if code and n<=len(code.splitlines()) else ''
        prefix=f'Line {n}: {source}\n'
    message=prefix+''.join(traceback.format_exception_only(type(exc),exc))
    return message[:1800]+('\n[Error shortened.]' if len(message)>1800 else '')



CASES=[{'id': 'original', 'name': 'Original five points', 'x': [1, 2, 3, 4, 5], 'y': [2, 4, 5, 4, 5]}, {'id': 'outlier', 'name': 'One changed observation', 'x': [1, 2, 3, 4, 5], 'y': [2, 4, 5, 4, 12]}, {'id': 'shift', 'name': 'Shift every y by 10', 'x': [1, 2, 3, 4, 5], 'y': [12, 14, 15, 14, 15]}, {'id': 'negative', 'name': 'Negative slope', 'x': [-2, -1, 0, 1, 2], 'y': [7, 5, 4, 1, -2]}, {'id': 'constant', 'name': 'Constant response', 'x': [1, 2, 3, 4, 5], 'y': [3, 3, 3, 3, 3]}]
REFERENCE='def fit_line(x, y):\n    xm, ym = sum(x)/len(x), sum(y)/len(y)\n    slope = sum((a-xm)*(b-ym) for a,b in zip(x,y))/sum((a-xm)**2 for a in x)\n    return slope, ym-slope*xm\n'
FUNCTION='fit_line'
def calculate(fn,c,t):
    x,y=list(c['x']),list(c['y']);out=fn(x,y)
    if x!=c['x'] or y!=c['y']:raise ValueError('Keep supplied coordinates unchanged.')
    if not isinstance(out,(tuple,list)) or len(out)!=2 or not all(finite(v) for v in out):raise ValueError('Return two finite numbers: slope, intercept.')
    slope,intercept=map(float,out);pred=[slope*a+intercept for a in x]
    if not all(finite(v) for v in pred):raise ValueError('Predictions must be finite.')
    residuals=[b-p for b,p in zip(y,pred)];sse=sum(r*r for r in residuals);sst=sum((b-sum(y)/len(y))**2 for b in y)
    if not finite(sse):raise ValueError('Residual sum of squares overflowed.')
    return dict(slope=slope,intercept=intercept,predictions=pred,residuals=residuals,sse=sse,r2=1-sse/sst if sst else None)
def check(v,c,t):
    # Independent raw-sum normal equations.
    x,y=c['x'],c['y'];n=len(x);sx,sy=sum(x),sum(y)
    a=(n*sum(a*b for a,b in zip(x,y))-sx*sy)/(n*sum(a*a for a in x)-sx*sx);b=(sy-a*sx)/n
    return [] if math.isclose(v['slope'],a,abs_tol=1e-9,rel_tol=1e-8) and math.isclose(v['intercept'],b,abs_tol=1e-9,rel_tol=1e-8) else ['Returned coefficients differ from the independent least-squares check.']

def normal_cdf(z):return .5*math.erfc(-z/math.sqrt(2))
def evaluate_request(request):
    result=dict(values=None,error=None,stdout='',issues=[],suite=[])
    output=BoundedOutput();code=''
    try:
        case=next((c for c in CASES if c['id']==request.get('caseId')),None)
        if case is None:raise ValueError('Choose a disclosed dataset.')
        threshold=0
        mode=request.get('mode','student')
        if mode not in ('student','reference'):raise ValueError('Unknown mode.')
        code=REFERENCE if mode=='reference' else request.get('code')
        if not isinstance(code,str) or len(code)>16000:raise ValueError('Code is limited to 16,000 characters.')
        def compile_function():
            ns={'__name__':'__student__','math':math,'normal_cdf':normal_cdf}
            exec(compile(code,'your_function.py','exec'),ns)
            if not callable(ns.get(FUNCTION)):raise TypeError('Define '+FUNCTION+'.')
            return ns[FUNCTION]
        with contextlib.redirect_stdout(output),contextlib.redirect_stderr(output):
            fn=compile_function();result['values']=calculate(fn,case,threshold)
            result['issues']=check(result['values'],case,threshold)
            if request.get('suite'):
                for c in CASES:
                    try:
                        issues=check(calculate(compile_function(),c,threshold),c,threshold)
                        result['suite'].append(dict(name=c['name'],passed=not issues,issues=issues))
                    except BaseException as exc:result['suite'].append(dict(name=c['name'],passed=False,issues=[error_text(exc,code)]))
    except BaseException as exc:result['error']=error_text(exc,code)
    result['stdout']=output.getvalue()
    return result

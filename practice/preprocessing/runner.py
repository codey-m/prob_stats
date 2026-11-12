"""Directly authored preprocessing practice runner; no course wiring."""
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



CASES=[{'id': 'original', 'name': 'Separated training and holdout values', 'train': [2, 4, 6, 8], 'holdout': [10, 12, 14]}, {'id': 'holdout_shift', 'name': 'Only the holdout moves', 'train': [2, 4, 6, 8], 'holdout': [20, 22, 24]}, {'id': 'train_shift', 'name': 'Only the training values move', 'train': [7, 9, 11, 13], 'holdout': [10, 12, 14]}, {'id': 'unequal', 'name': 'Unequal partition sizes', 'train': [1, 2, 4, 5, 8], 'holdout': [3, 9]}]
REFERENCE = """import math
def standardize(train, holdout):
    mean = sum(train)/len(train)
    spread = math.sqrt(sum((x-mean)**2 for x in train)/len(train))
    return mean, spread, [(x-mean)/spread for x in train], [(x-mean)/spread for x in holdout]
"""

def stats(rows):
    mean=math.fsum(rows)/len(rows)
    # E[X²] - E[X]² is independent of the reference's centered-square formula.
    spread=math.sqrt(math.fsum(x*x for x in rows)/len(rows)-mean*mean)
    return mean,spread

def close(a,b):return math.isclose(a,b,rel_tol=1e-8,abs_tol=1e-9)
def calculate(fn,c):
    train,holdout=list(c['train']),list(c['holdout'])
    value=fn(train,holdout)
    if train!=c['train'] or holdout!=c['holdout']:raise ValueError('Keep the supplied lists unchanged.')
    if not isinstance(value,(list,tuple)) or len(value)!=4:raise ValueError('Return (mean, spread, train_scaled, holdout_scaled).')
    mean,spread,t,h=value
    if not finite(mean) or not finite(spread):raise ValueError('Mean and spread must be finite numbers.')
    for values,source in [(t,train),(h,holdout)]:
        if not isinstance(values,(list,tuple)) or len(values)!=len(source) or not all(finite(x) for x in values):raise ValueError('Return one finite scaled value per row in each partition.')
    return dict(mean=float(mean),spread=float(spread),train=list(map(float,t)),holdout=list(map(float,h)))

def check(v,c):
    mean,spread=stats(c['train']);issues=[]
    if not close(v['mean'],mean):issues.append('The fitted mean differs from the training-only check.')
    if not close(v['spread'],spread):issues.append('The fitted spread differs from the training-only population-spread check.')
    if v['spread']<=0:issues.append('The returned spread must be positive for these nonconstant inputs.')
    else:
        # Test the downstream transform on the student's own returned parameters.
        for key in ['train','holdout']:
            if any(not close(found,(x-v['mean'])/v['spread']) for x,found in zip(c[key],v[key])):issues.append('The '+key+' output does not reuse the returned mean and spread.')
    return issues

def evaluate_request(request):
    result=dict(values=None,error=None,stdout='',issues=[],suite=[]);output=BoundedOutput();code=''
    try:
        case=next((c for c in CASES if c['id']==request.get('caseId')),None)
        if case is None:raise ValueError('Choose a disclosed dataset.')
        mode=request.get('mode','student')
        if mode not in ('student','reference'):raise ValueError('Unknown mode.')
        code=REFERENCE if mode=='reference' else request.get('code')
        if not isinstance(code,str) or len(code)>16000:raise ValueError('Code is limited to 16,000 characters.')
        def function():
            ns={'__name__':'__student__','math':math};exec(compile(code,'your_function.py','exec'),ns)
            if not callable(ns.get('standardize')):raise TypeError('Define standardize(train, holdout).')
            return ns['standardize']
        with contextlib.redirect_stdout(output),contextlib.redirect_stderr(output):
            result['values']=calculate(function(),case);result['issues']=check(result['values'],case)
            if request.get('suite'):
                for c in CASES:
                    try:
                        issues=check(calculate(function(),c),c);result['suite'].append(dict(name=c['name'],passed=not issues,issues=issues))
                    except BaseException as exc:result['suite'].append(dict(name=c['name'],passed=False,issues=[error_text(exc,code)]))
    except BaseException as exc:result['error']=error_text(exc,code)
    result['stdout']=output.getvalue();return result

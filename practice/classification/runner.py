"""Directly authored classification practice runner; no course wiring."""
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



CASES=[{'id': 'original', 'name': 'Original eight cases', 'scores': [-1.2, 0.8, 2.1, -0.5, 1.5, -2, 0.3, 1.1], 'labels': [0, 0, 1, 1, 1, 0, 1, 0]}, {'id': 'boundary', 'name': 'At the decision boundary', 'scores': [-0.1, 0, 0.1, 1, -1], 'labels': [0, 1, 1, 0, 0]}, {'id': 'imbalanced', 'name': 'Few positives', 'scores': [-2, -1.8, -1.6, -1.4, -1.2, -1, -0.8, -0.6, -0.4, -0.2], 'labels': [0, 0, 0, 0, 0, 0, 0, 0, 1, 1]}, {'id': 'changed', 'name': 'Changed scores', 'scores': [0.2, -0.3, 1.2, -1.4, 0.6, -0.1], 'labels': [1, 0, 0, 1, 1, 0]}]
REFERENCE='def predict(scores, threshold):\n    return [int(score > threshold) for score in scores]\n'
FUNCTION='predict'
def calculate(fn,c,t):
    scores=list(c['scores']);predictions=fn(scores,t)
    if scores!=c['scores']:raise ValueError('Keep supplied scores unchanged.')
    if not isinstance(predictions,(list,tuple)) or len(predictions)!=len(scores) or any(type(p) is not int or p not in (0,1) for p in predictions):raise ValueError('Return one integer 0 or 1 per input score.')
    cells={'TN':[],'FP':[],'FN':[],'TP':[]}
    for i,(label,pred) in enumerate(zip(c['labels'],predictions)):cells[('T' if pred==label else 'F')+('P' if pred else 'N')].append(i)
    return dict(predictions=list(predictions),cells=cells,accuracy=(len(cells['TN'])+len(cells['TP']))/len(scores),recall=len(cells['TP'])/sum(c['labels']) if sum(c['labels']) else None)
def check(v,c,t):
    # Independent decision intervals, not a copy of the reference comprehension.
    expected=[]
    for score in c['scores']:
        expected.append(0 if score<=t else 1)
    count=sum(a!=b for a,b in zip(v['predictions'],expected))
    return [] if not count else [str(count)+' returned prediction(s) differ from the stated strict threshold rule.']

def normal_cdf(z):return .5*math.erfc(-z/math.sqrt(2))
def evaluate_request(request):
    result=dict(values=None,error=None,stdout='',issues=[],suite=[])
    output=BoundedOutput();code=''
    try:
        case=next((c for c in CASES if c['id']==request.get('caseId')),None)
        if case is None:raise ValueError('Choose a disclosed dataset.')
        threshold=request.get('threshold',0)
        if not finite(threshold) or abs(threshold)>3:raise ValueError('Threshold must be between -3 and 3.')
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

"""Directly authored ztest practice runner; no course wiring."""
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



CASES=[{'id': 'original', 'name': 'Original sample mean', 'xbar': 10.1, 'mu0': 10, 'sigma': 0.2, 'n': 25}, {'id': 'negative', 'name': 'Equal difference below the null', 'xbar': 9.9, 'mu0': 10, 'sigma': 0.2, 'n': 25}, {'id': 'larger', 'name': 'Four times the sample size', 'xbar': 10.1, 'mu0': 10, 'sigma': 0.2, 'n': 100}, {'id': 'null', 'name': 'Sample mean equals the null', 'xbar': 10, 'mu0': 10, 'sigma': 0.2, 'n': 25}, {'id': 'noise', 'name': 'Twice the population standard deviation', 'xbar': 10.1, 'mu0': 10, 'sigma': 0.4, 'n': 25}]
REFERENCE='def z_test(xbar, mu0, sigma, n):\n    z = (xbar-mu0)/(sigma/math.sqrt(n))\n    return z, math.erfc(abs(z)/math.sqrt(2))\n'
FUNCTION='z_test'
def calculate(fn,c,t):
    out=fn(c['xbar'],c['mu0'],c['sigma'],c['n'])
    if not isinstance(out,(tuple,list)) or len(out)!=2 or not all(finite(v) for v in out):raise ValueError('Return two finite numbers: z and p.')
    z,p=map(float,out)
    return dict(z=z,p=p,tail_area=math.erfc(abs(z)/math.sqrt(2)),valid_p=0<=p<=1)
def check(v,c,t):
    expected_z=(c['xbar']-c['mu0'])*math.sqrt(c['n'])/c['sigma']
    expected_p=2*normal_cdf(-abs(expected_z));issues=[]
    if not math.isclose(v['z'],expected_z,abs_tol=1e-9,rel_tol=1e-8):issues.append('Returned z differs from the independent standardization check.')
    if not v['valid_p']:issues.append('Returned p must be between 0 and 1.')
    elif not math.isclose(v['p'],expected_p,abs_tol=1e-10,rel_tol=1e-8):issues.append('Returned p differs from the independent two-sided tail check.')
    return issues

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

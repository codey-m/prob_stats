"""Design rows and residual shapes: real NumPy, fixed formative inputs."""
import contextlib
import io
import math
import reprlib
import traceback
import numpy as np


def intended(case):
    X = [[1, x, g, x*g] for x,g in zip(case['x'],case['g'])]
    # Group-specific intercept and slope, independently of the matrix product.
    b=case['beta']
    pred=[(b[0]+b[2]*g)+(b[1]+b[3]*g)*x for x,g in zip(case['x'],case['g'])]
    return X,pred,[y-p for y,p in zip(case['y'],pred)]


class BoundedOutput(io.TextIOBase):
    def __init__(self):self.parts,self.left,self.truncated=[],2000,False
    def write(self,text):
        text=str(text)
        if self.left:self.parts.append(text[:self.left])
        self.truncated |= len(text)>self.left
        self.left=max(0,self.left-len(text))
        return len(text)
    def getvalue(self):return ''.join(self.parts)+('\n[Output limited to 2,000 characters.]' if self.truncated else '')


def error_text(exc,code):
    frames=[f for f in traceback.extract_tb(exc.__traceback__) if f.filename=='your_function.py']
    prefix=''
    if frames:
        num=frames[-1].lineno;lines=code.splitlines()
        prefix=f'Line {num}: {lines[num-1][:200] if num<=len(lines) else ""}\n'
    return (prefix+''.join(traceback.format_exception_only(type(exc),exc)))[:1800]


def evaluate_submission(code,case,stage):
    if stage not in ('design','residual'):raise ValueError('Unknown stage.')
    if case not in CASES:raise ValueError('Choose a disclosed practice table.')
    if not isinstance(code,str) or len(code)>16000:raise ValueError('Code is limited to 16,000 characters.')
    X,pred,residual=intended(case);n=len(pred)
    args=([np.array(case['x'],float),np.array(case['g'],float)] if stage=='design'
          else [np.array(case['y'],float),np.array(pred,float).reshape(n,1)])
    originals=[a.copy() for a in args]
    result=dict(values=None,shape=None,passed=False,mutated=False,error=None,stdout='',pattern=None,
                wrong=None,predictions=None,residuals=None,required_shape=[n,4] if stage=='design' else [n])
    ns={'__name__':'__student__','np':np};stream=BoundedOutput()
    with contextlib.redirect_stdout(stream),contextlib.redirect_stderr(stream):
        try:
            exec(compile(code,'your_function.py','exec'),ns)
            name='design' if stage=='design' else 'residuals';fn=ns.get(name)
            if not callable(fn):raise TypeError(f'Define {name}({"x, group" if stage=="design" else "y, predicted"}).')
            try:returned=fn(*args)
            finally:result['mutated']=any(not np.array_equal(a,b) for a,b in zip(args,originals))
            arr=np.asarray(returned);result['shape']=list(arr.shape)
            if arr.dtype.kind not in 'iuf':raise TypeError('Return real numbers, not Boolean, text, or complex values.')
            if arr.ndim not in (1,2) or arr.size>64 or any(d>8 for d in arr.shape):raise ValueError('Return a small vector or matrix, at most 8 by 8.')
            if not np.all(np.isfinite(arr)) or np.any(np.abs(arr)>1e6):raise ValueError('Return finite values up to 1,000,000 in magnitude.')
            result['values']=arr.tolist()
            if list(arr.shape)!=result['required_shape']:
                if stage=='design' and arr.shape==(4,n) and np.allclose(arr,np.array(X).T):result['pattern']='transposed'
                if stage=='residual' and arr.shape==(n,n) and np.allclose(arr,np.array(case['y'])[None,:]-np.array(pred)[:,None]):result['pattern']='broadcast'
                if stage=='residual' and arr.shape==(n,1) and np.allclose(arr,np.array(residual)[:,None]):result['pattern']='column'
                raise ValueError(f'Returned shape {arr.shape}; required shape {tuple(result["required_shape"])}.')
            expected=X if stage=='design' else residual
            result['wrong']=int(np.count_nonzero(~np.isclose(arr,expected,rtol=1e-8,atol=1e-8)))
            result['passed']=result['wrong']==0 and not result['mutated']
            if stage=='design':
                # These are the stated model's operation on the returned X, not code traces.
                actual=[sum(float(v)*b for v,b in zip(row,case['beta'])) for row in result['values']]
                result['predictions']=actual;result['residuals']=[y-p for y,p in zip(case['y'],actual)]
                candidates={'specified':X,'swapped-x-group':[[1,g,x,x*g] for x,g in zip(case['x'],case['g'])],
                            'additive':[[1,x,g,0] for x,g in zip(case['x'],case['g'])],
                            'sum-interaction':[[1,x,g,x+g] for x,g in zip(case['x'],case['g'])]}
                if n==4:candidates['transposed']=np.array(X).T
                result['pattern']=next((k for k,v in candidates.items() if np.allclose(arr,v)),None)
            elif np.allclose(arr,-np.array(residual)):result['pattern']='reversed'
            elif result['wrong']==0:result['pattern']='matched'
        except BaseException as exc:result['error']=error_text(exc,code)
    result['stdout']=stream.getvalue()
    return result


REFERENCE='''def design(x, group):
    return np.column_stack((np.ones(len(x)), x, group, x*group))

def residuals(y, predicted):
    return y - predicted[:, 0]
'''


def evaluate_request(request):
    code=REFERENCE if request.get('mode')=='reference' else request['code']
    result=evaluate_submission(code,request['case'],request['stage'])
    if request.get('suite'):
        result['suite']=[]
        for case in CASES:
            row=evaluate_submission(code,case,request['stage'])
            result['suite'].append(dict(name=case['name'],passed=row['passed'],error=row['error'],shape=row['shape']))
    return result

CASES = [{'id': 'six', 'name': 'Six observations', 'x': [0, 1, 3, 0, 1, 3], 'g': [0, 0, 0, 1, 1, 1], 'y': [1.5, 2.8, 4.5, 3, 5.2, 9.5], 'beta': [1, 1, 2, 1]}, {'id': 'five', 'name': 'Five observations, changed coefficients', 'x': [-2, 0, 2, -1, 3], 'g': [1, 0, 1, 0, 0], 'y': [2.5, -0.5, 0.2, -1, 1.2], 'beta': [-1, 0.5, 3, -1]}, {'id': 'square', 'name': 'Four observations: square design matrix', 'x': [-1, 2, 0, 3], 'g': [0, 1, 1, 0], 'y': [-1, 3, 0, 5], 'beta': [0.5, 1.5, -1, 0.5]}]

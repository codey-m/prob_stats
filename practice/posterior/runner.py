"""Normal-normal updating, with independent closed-form checks. No packages needed."""
import contextlib
import io
import json
import math
import numbers
import traceback

CASES = [
    dict(id='original', name='Four observations', mean=0, variance=1, noise=4, observations=[3,5,4,6]),
    dict(id='strong-prior', name='More precise prior', mean=0, variance=.25, noise=4, observations=[3,5,4,6]),
    dict(id='precise-data', name='More precise observations', mean=0, variance=1, noise=.25, observations=[3,5,4,6]),
    dict(id='opposing', name='Observations below the prior', mean=4, variance=2, noise=1, observations=[-3,-1,0]),
    dict(id='equal', name='Equal information, one observation', mean=2, variance=4, noise=4, observations=[10]),
]
REFERENCE = '''def update_normal_normal(prior_mean, prior_var, obs, lik_var):
    precision = 1 / prior_var + 1 / lik_var
    return ((prior_mean / prior_var + obs / lik_var) / precision, 1 / precision)
'''

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


def validate_case(case):
    if not isinstance(case, dict) or not isinstance(case.get('observations'), list) or not 1 <= len(case['observations']) <= 8:
        raise ValueError('Supply 1 to 8 observations.')
    if any(not finite(x) or abs(x)>100 for x in [case.get('mean'), *case['observations']]):
        raise ValueError('Input means and observations must be finite and between -100 and 100.')
    if any(not finite(case.get(k)) or not .01 <= case[k] <= 100 for k in ('variance','noise')):
        raise ValueError('Input variances must be between 0.01 and 100.')


def validate_return(value):
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise TypeError('Return (posterior_mean, posterior_variance), in that order.')
    if not all(finite(x) for x in value):
        raise ValueError('Return two finite numbers; Boolean, NaN and infinite values are invalid.')
    mean, variance = map(float, value)
    if variance <= 0:
        raise ValueError('Posterior variance must be strictly positive to draw a normal density.')
    return [mean, variance]


def exact(case, observations):
    """Closed-form weighted sum, independent of the reference precision algorithm."""
    n = len(observations)
    denominator = case['noise'] + n * case['variance']
    return [(case['noise'] * case['mean'] + case['variance'] * sum(observations)) / denominator,
            case['variance'] * case['noise'] / denominator]


def matches(a, b):
    return all(math.isclose(x,y,rel_tol=1e-8,abs_tol=1e-10) for x,y in zip(a,b))


def error_text(exc, code=""):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == 'your_function.py']
    message = ('Your function, line '+str(frames[-1].lineno)+':\n' if frames else '')
    if frames and code:
        message += code.splitlines()[frames[-1].lineno-1].strip()[:200] + '\n'
    message += ''.join(traceback.format_exception_only(type(exc),exc))
    return message[:1800] + ('\n[Error shortened.]' if len(message)>1800 else '')


def trajectory(function, case, code=""):
    result = dict(steps=[], batch=None, expected=exact(case,case['observations']), error=None, agreement=None, correct=False)
    m,v = case['mean'],case['variance']
    try:
        for i,x in enumerate(case['observations']):
            try:
                posterior = validate_return(function(m,v,x,case['noise']))
            except BaseException as exc:
                result['error'] = 'Observation '+str(i+1)+': '+error_text(exc,code)
                return result
            result['steps'].append(dict(prior=[m,v],observation=x,posterior=posterior,
                                        expected=exact(case,case['observations'][:i+1])))
            m,v = posterior
        try:
            result['batch'] = validate_return(function(case['mean'],case['variance'],sum(case['observations'])/len(case['observations']),case['noise']/len(case['observations'])))
        except BaseException as exc:
            result['error'] = 'Batch comparison: '+error_text(exc,code)
            return result
        result['agreement'] = matches([m,v],result['batch'])
        result['correct'] = all(matches(step['posterior'],step['expected']) for step in result['steps']) and matches(result['batch'],result['expected'])
    except BaseException as exc:
        result['error'] = error_text(exc,code)
    return result


def evaluate_request(request):
    output=BoundedOutput()
    code=""
    result=dict(steps=[],batch=None,error=None,stdout='',suite=[])
    try:
        case=request['case'];validate_case(case)
        mode=request.get('mode','student')
        if mode not in ('reference','student'):
            raise ValueError('Unknown run mode.')
        code=REFERENCE if mode=='reference' else request.get('code')
        if not isinstance(code,str) or len(code)>16000:
            raise ValueError('Code is limited to 16,000 characters.')
        namespace={'__name__':'__student__'}
        with contextlib.redirect_stdout(output),contextlib.redirect_stderr(output):
            exec(compile(code,'your_function.py','exec'),namespace)
            function=namespace.get('update_normal_normal')
            if not callable(function):
                raise TypeError('Define update_normal_normal(prior_mean, prior_var, obs, lik_var).')
            result.update(trajectory(function,case,code))
            if request.get('suite'):
                for probe in CASES:
                    # Separate namespace per case to avoid one probe contaminating another.
                    probe_ns={'__name__':'__student__'}
                    try:
                        exec(compile(code,'your_function.py','exec'),probe_ns)
                        row=trajectory(probe_ns['update_normal_normal'],probe,code)
                        result['suite'].append(dict(name=probe['name'],passed=row['correct'],agreement=row['agreement'],error=row['error']))
                    except BaseException as exc:
                        result['suite'].append(dict(name=probe['name'],passed=False,agreement=None,error=error_text(exc,code)))
    except BaseException as exc:
        result['error']=error_text(exc,code)
    result['stdout']=output.getvalue()
    return result

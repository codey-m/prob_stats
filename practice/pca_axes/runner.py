"""PCA axes: real NumPy execution, independent scalar oracles, fixed formative inputs."""
import contextlib
import io
import math
import reprlib
import traceback
import numpy as np

CASES = [
    {'id': 'tilted-four', 'name': 'Four observations, two features', 'X': [[2, 8], [4, 7], [6, 13], [8, 12]]},
    {'id': 'square', 'name': 'Two observations, two features: a square array', 'X': [[2, 9], [6, 3]]},
    {'id': 'negative-five', 'name': 'Five observations with a negative association', 'X': [[-4, 9], [-1, 6], [0, 7], [3, 2], [7, -1]]},
]
STAGES = {'center', 'project'}


def inputs(case):
    X = case['X']
    n = len(X)
    means = [sum(row[j] for row in X) / n for j in range(2)]
    C = [[row[j] - means[j] for j in range(2)] for row in X]
    a = sum(r[0] ** 2 for r in C)
    b = sum(r[0] * r[1] for r in C)
    d = sum(r[1] ** 2 for r in C)
    theta = .5 * math.atan2(2 * b, a - d)
    u, v = math.cos(theta), math.sin(theta)
    return C, [[u, -v], [v, u]]


def expected(case, stage):
    C, V = inputs(case)
    if stage == 'center':
        return C
    return [[sum(row[j] * V[j][k] for j in range(2)) for k in range(2)] for row in C]


class BoundedOutput(io.TextIOBase):
    def __init__(self):
        self.parts, self.left, self.truncated = [], 2000, False

    def write(self, text):
        text = str(text)
        self.parts.append(text[:self.left]) if self.left else None
        self.truncated |= len(text) > self.left
        self.left = max(0, self.left - len(text))
        return len(text)

    def getvalue(self):
        return ''.join(self.parts) + ('\n[Output limited to 2,000 characters.]' if self.truncated else '')


def error_text(exc, code):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == 'your_function.py']
    prefix = ''
    if frames:
        num = frames[-1].lineno
        lines = code.splitlines()
        prefix = f'Line {num}: {lines[num-1][:200] if num <= len(lines) else ""}\n'
    return (prefix + ''.join(traceback.format_exception_only(type(exc), exc)))[:1800]


def evaluate_submission(code, case, stage):
    if stage not in STAGES:
        raise ValueError('Unknown stage.')
    # Presets only: no free input that can reproduce a paired graded calculation.
    if case not in CASES:
        raise ValueError('Choose one of the disclosed practice tables.')
    if not isinstance(code, str) or len(code) > 16000:
        raise ValueError('Code is limited to 16,000 characters.')
    C, V = inputs(case)
    args = [np.array(case['X'], dtype=float)] if stage == 'center' else [np.array(C), np.array(V)]
    originals = [x.copy() for x in args]
    result = dict(values=None, matches=[], passed=False, mutated=False, error=None, stdout='',
                  pattern=None, returned_shape=None, returned=None, input_shapes=[list(x.shape) for x in args])
    ns = {'__name__': '__student__', 'np': np}
    stream = BoundedOutput()
    with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
        try:
            exec(compile(code, 'your_function.py', 'exec'), ns)
            fn = ns.get(stage)
            if not callable(fn):
                raise TypeError(f'Define {stage}({"X" if stage == "center" else "C, V"}).')
            try:
                returned = fn(*args)
            finally:
                result['mutated'] = any(not np.array_equal(a, b) for a, b in zip(args, originals))
            result['returned'] = reprlib.repr(returned)[:500]
            arr = np.asarray(returned)
            result['returned_shape'] = list(arr.shape)
            if arr.shape != (len(C), 2):
                raise ValueError(f'Returned shape {arr.shape}; expected one row per observation and two columns.')
            if arr.dtype.kind not in 'iuf':
                raise TypeError('Return real numeric values, not Boolean, complex, or text values.')
            if not np.all(np.isfinite(arr)) or np.any(np.abs(arr) > 1e6):
                raise ValueError('Return finite values with magnitude at most 1,000,000.')
            result['values'] = arr.tolist()
        except BaseException as exc:
            result['error'] = error_text(exc, code)
    if result['values'] is not None:
        arr = np.array(result['values'])
        result['matches'] = np.isclose(arr, expected(case, stage), rtol=1e-7, atol=1e-7).tolist()
        result['passed'] = bool(np.all(result['matches'])) and not result['mutated']
        if stage == 'center':
            X = np.array(case['X'], dtype=float)
            candidates = {'column': np.array(C), 'row': X - X.mean(axis=1, keepdims=True),
                          'global': X - X.mean(), 'unchanged': X}
            if len(X) == 2:
                candidates['row-on-columns'] = X - X.mean(axis=1)
        else:
            A, B = np.array(C), np.array(V)
            candidates = {'columns': np.array(expected(case, stage)), 'transposed': A @ B.T,
                          'unchanged': A}
            if len(A) == 2:
                candidates['elementwise'] = A * B
        result['pattern'] = next((name for name, value in candidates.items()
                                  if np.allclose(arr, value, rtol=1e-7, atol=1e-7)), None)
    result['stdout'] = stream.getvalue()
    return result


REFERENCE = '''def center(X):
    return X - np.mean(X, axis=0)

def project(C, V):
    return np.matmul(C, V)
'''


def evaluate_request(request):
    code = REFERENCE if request.get('mode') == 'reference' else request['code']
    result = evaluate_submission(code, request['case'], request['stage'])
    if request.get('suite'):
        result['suite'] = []
        for case in CASES:
            row = evaluate_submission(code, case, request['stage'])
            result['suite'].append(dict(id=case['id'], name=case['name'], passed=row['passed'],
                                        error=row['error'], mutated=row['mutated']))
    return result

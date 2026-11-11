"""Bootstrap first playable. Standard library only; browser and CPython."""
import contextlib
import io
import json
import math
import numbers
import random
import traceback

CASES = [
    {'id': 'five', 'name': 'Five observations', 'data': [4, 8, 10, 12, 16]},
    {'id': 'wide', 'name': 'Same size, wider spread', 'data': [-2, 6, 10, 14, 22]},
    {'id': 'ten', 'name': 'Same distribution, n = 10', 'data': [4, 8, 10, 12, 16, 4, 8, 10, 12, 16]},
    {'id': 'tiny', 'name': 'Two observations', 'data': [0, 2]},
]
REFERENCE = '''def resample(data, rng):
    return [rng.choice(data) for _ in data]
'''

class BoundedOutput(io.TextIOBase):
    def __init__(self):
        self.parts, self.remaining = [], 2000
        self.truncated = False
    def write(self, text):
        text = str(text)
        if self.remaining:
            self.parts.append(text[:self.remaining])
        self.truncated |= len(text) > self.remaining
        self.remaining = max(0, self.remaining - len(text))
        return len(text)
    def getvalue(self):
        return ''.join(self.parts) + ('\n[Output limited to 2,000 characters.]' if self.truncated else '')

class TrackedRandom(random.Random):
    def __init__(self, seed):
        super().__init__(seed)
        self.calls = 0
    def random(self):
        self.calls += 1
        return super().random()
    def getrandbits(self, k):
        self.calls += 1
        return super().getrandbits(k)


def spread(values):
    mean = sum(values) / len(values)
    return math.sqrt(sum((x - mean) ** 2 for x in values) / len(values))


def validate_data(data):
    if not isinstance(data, list) or not 2 <= len(data) <= 20:
        raise ValueError('Use between 2 and 20 observations.')
    if any(isinstance(x, bool) or not isinstance(x, numbers.Real) or not math.isfinite(x) or abs(x) > 100 for x in data):
        raise ValueError('Observations must be finite numbers between -100 and 100.')


def collect(function, data, seed, count):
    rng = TrackedRandom(seed)
    samples, means = [], []
    for _ in range(count):
        supplied = list(data)
        returned = function(supplied, rng)
        if supplied != data:
            raise ValueError('Keep the supplied observations unchanged.')
        if not isinstance(returned, (list, tuple)) or len(returned) != len(data):
            raise ValueError('Return a list of the same length as data, containing the selected observations.')
        if any(isinstance(x, bool) or not isinstance(x, numbers.Real) or not math.isfinite(x) or x not in data for x in returned):
            raise ValueError('Every selected value must be one of the original observations.')
        sample = [float(x) for x in returned]
        samples.append(sample)
        means.append(sum(sample) / len(sample))
    return samples, means, rng.calls


def diagnostics(function):
    """Disclosed deterministic probes; useful diagnostics, not proof of a distribution."""
    issues = []
    for case in CASES:
        data = case['data']
        a, _, calls = collect(function, data, 17, 40)
        b, _, _ = collect(function, data, 17, 40)
        c, _, _ = collect(function, data, 91, 40)
        if not calls:
            issues.append(case['name'] + ': the supplied random generator was not used.')
        if a != b:
            issues.append(case['name'] + ': the same seed did not reproduce the same draws.')
        if a == c:
            issues.append(case['name'] + ': changing the seed did not change any draw.')
        # Duplicate-valued source records cannot identify replacement by value.
        # Replacement is probed on the distinct-valued cases.
        if len(set(data)) == len(data) and not any(len(set(row)) < len(row) for row in a):
            issues.append(case['name'] + ': none of 40 draws repeated an observation; check replacement.')
    return issues


def evaluate_request(request):
    result = {'samples': [], 'means': [], 'error': None, 'stdout': '', 'issues': [], 'checks': False}
    output = BoundedOutput()
    try:
        data = request['data']
        validate_data(data)
        seed, count = request.get('seed', 17), request.get('count', 300)
        if type(seed) is not int or not 0 <= seed <= 999999 or type(count) is not int or not 20 <= count <= 1000:
            raise ValueError('Use seed 0 to 999999 and 20 to 1,000 resamples.')
        mode = request.get('mode', 'student')
        if mode not in ('student', 'reference'):
            raise ValueError('Unknown run mode.')
        code = REFERENCE if mode == 'reference' else request.get('code')
        if not isinstance(code, str) or len(code) > 16000:
            raise ValueError('Code is limited to 16,000 characters.')
        namespace = {'__name__': '__student__'}
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            exec(compile(code, 'your_function.py', 'exec'), namespace)
            function = namespace.get('resample')
            if not callable(function):
                raise TypeError('Define resample(data, rng).')
            samples, means, _ = collect(function, data, seed, count)
            result.update(samples=samples, means=means, se=spread(means), observation_sd=spread(data))
            if request.get('suite'):
                result['checks'] = True
                try:
                    result['issues'] = diagnostics(function)
                except BaseException as exc:
                    result['issues'] = ['Changed-case check: ' + str(exc)[:500]]
    except BaseException as exc:
        message = ''.join(traceback.format_exception_only(type(exc), exc))
        frames = [frame for frame in traceback.extract_tb(exc.__traceback__) if frame.filename == 'your_function.py']
        if frames:
            number=frames[-1].lineno
            source=code.splitlines()[number-1].strip()[:200]
            message = 'Your function, line ' + str(number) + ': ' + source + '\n' + message
        result['error'] = message[:1800] + ('\n[Error shortened.]' if len(message) > 1800 else '')
    result['stdout'] = output.getvalue()
    return result

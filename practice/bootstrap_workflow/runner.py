"""Bootstrap workflow: standard-library Python, fixed row plans, paired-data statistic."""
import contextlib
import io
import math
import numbers
import reprlib
import traceback


def covariance(sample):
    """Supplied helper: sample covariance, with fresh means on every call."""
    sample = valid_sample(sample)
    n = len(sample)
    if n < 2:
        raise ValueError('The statistic needs at least two sampled rows.')
    mx = sum(row[0] for row in sample) / n
    my = sum(row[1] for row in sample) / n
    return sum((row[0] - mx) * (row[1] - my) for row in sample) / (n - 1)


def oracle(sample):
    """Independent pairwise-difference identity, not the helper's centered formula."""
    n = len(sample)
    if n < 2:
        return None
    return sum((sample[i][0] - sample[j][0]) * (sample[i][1] - sample[j][1])
               for i in range(n) for j in range(i)) / (n * (n - 1))


def valid_sample(sample):
    if not isinstance(sample, (list, tuple)) or not 1 <= len(sample) <= 20:
        raise ValueError('A sample must be a list of 1 to 20 paired rows.')
    if any(not isinstance(row, (list, tuple)) or len(row) != 2 for row in sample):
        raise ValueError('Each sampled row must contain two numbers, x and y.')
    if any(isinstance(x, bool) or not isinstance(x, numbers.Real) or
           not math.isfinite(x) or abs(x) > 1000 for row in sample for x in row):
        raise ValueError('Sample entries must be finite real numbers up to 1,000 in magnitude.')
    return [list(row) for row in sample]


class BoundedOutput(io.TextIOBase):
    def __init__(self):
        self.parts, self.left, self.truncated = [], 2000, False

    def write(self, text):
        text = str(text)
        if self.left:
            self.parts.append(text[:self.left])
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


def inspect_records(returned, case):
    limit = max(40, 2 * len(case['draws']))
    if not isinstance(returned, (list, tuple)) or len(returned) > limit:
        raise ValueError(f'Return a list of at most {limit} (sample, value) pairs.')
    records = []
    for i, item in enumerate(returned):
        record = dict(sample=None, value=None, stored=reprlib.repr(item)[:600], sample_ok=False,
                      value_ok=False, intended_value_ok=False, error=None)
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            record['error'] = 'Each replicate needs a (sample, value) pair.'
            records.append(record)
            continue
        sample, value = item
        record['stored'] = reprlib.repr(value)[:600]
        try:
            record['sample'] = valid_sample(sample)
        except (ValueError, TypeError) as exc:
            record['error'] = str(exc)
        if isinstance(value, bool) or not isinstance(value, numbers.Real) or not math.isfinite(value) or abs(value) > 1e6:
            record['error'] = record['error'] or 'The stored item is not one finite numeric statistic.'
        else:
            record['value'] = float(value)
        if i < len(case['draws']):
            wanted = [case['rows'][j] for j in case['draws'][i]]
            record['sample_ok'] = record['sample'] == wanted
            intended = oracle(wanted)
            record['intended_value_ok'] = record['value'] is not None and math.isclose(record['value'], intended, rel_tol=1e-8, abs_tol=1e-8)
        if record['sample'] and record['value'] is not None:
            own = oracle(record['sample'])
            record['value_ok'] = own is not None and math.isclose(record['value'], own, rel_tol=1e-8, abs_tol=1e-8)
        records.append(record)
    return records


def evaluate_submission(code, case):
    if case not in CASES:
        raise ValueError('Choose one of the disclosed practice tables.')
    if not isinstance(code, str) or len(code) > 16000:
        raise ValueError('Code is limited to 16,000 characters.')
    rows = [row[:] for row in case['rows']]
    plans = [draw[:] for draw in case['draws']]
    result = dict(records=[], count_ok=False, passed=False, mutated=False, error=None, stdout='')
    ns = {'__name__': '__student__'}
    stream = BoundedOutput()
    with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
        try:
            exec(compile(code, 'your_function.py', 'exec'), ns)
            fn = ns.get('bootstrap')
            if not callable(fn):
                raise TypeError('Define bootstrap(rows, draw_plan, statistic).')
            try:
                returned = fn(rows, plans, covariance)
            finally:
                result['mutated'] = rows != case['rows'] or plans != case['draws']
            result['records'] = inspect_records(returned, case)
            result['count_ok'] = len(result['records']) == len(case['draws'])
            result['passed'] = result['count_ok'] and not result['mutated'] and all(
                r['sample_ok'] and r['value_ok'] and not r['error'] for r in result['records'])
        except BaseException as exc:
            result['error'] = error_text(exc, code)
    result['stdout'] = stream.getvalue()
    return result


REFERENCE = '''def bootstrap(rows, draw_plan, statistic):
    results = []
    for indices in draw_plan:
        sample = [rows[i][:] for i in indices]
        value = statistic(sample)
        results.append((sample, value))
    return results
'''


def evaluate_request(request):
    # The check table belongs to a course check: no reference output, and no suite verdict for it.
    if request.get('mode') == 'reference' and request.get('case', {}).get('check'):
        raise ValueError('Run reference is off for the check table.')
    code = REFERENCE if request.get('mode') == 'reference' else request['code']
    result = evaluate_submission(code, request['case'])
    if request.get('suite'):
        result['suite'] = []
        for case in CASES:
            if case.get('check'):
                continue
            row = evaluate_submission(code, case)
            result['suite'].append(dict(name=case['name'], passed=row['passed'], error=row['error'],
                                        sample_mismatches=sum(not r['sample_ok'] for r in row['records']),
                                        value_mismatches=sum(not r['value_ok'] for r in row['records'])))
    return result

CASES = [{'id': 'paired-four', 'name': 'Four paired observations', 'rows': [[1, 3], [2, 8], [4, 6], [7, 14]], 'draws': [[0, 0, 2, 3], [3, 3, 3, 3], [3, 2, 1, 0], [0, 3, 3, 1], [0, 0, 0, 0], [1, 1, 0, 3], [2, 3, 1, 1], [2, 3, 0, 0], [3, 2, 3, 0], [2, 2, 1, 2], [0, 0, 0, 3], [0, 2, 3, 0]]}, {'id': 'negative-five', 'name': 'Five paired observations', 'rows': [[0, 12], [2, 9], [5, 8], [8, 1], [10, 3]], 'draws': [[0, 0, 2, 3, 4], [4, 4, 4, 4, 4], [3, 0, 0, 0, 3], [1, 2, 0, 3, 2], [4, 4, 3, 1, 3], [1, 1, 3, 3, 4], [4, 1, 4, 3, 2], [2, 4, 1, 3, 3], [4, 1, 2, 2, 4], [3, 3, 4, 0, 2], [1, 2, 1, 2, 0], [4, 3, 1, 3, 3]]}, {'id': 'three', 'name': 'Three paired observations', 'rows': [[1, 4], [3, 9], [6, 2]], 'draws': [[0, 0, 2], [2, 2, 2], [2, 1, 2], [1, 1, 2], [2, 0, 0], [2, 0, 1], [0, 0, 2], [1, 0, 1], [2, 2, 2], [2, 0, 0], [2, 0, 1], [1, 2, 0]]}, {'id': 'check', 'name': 'Check table: six paired observations, 200 plans', 'check': True, 'rows': [[2, 5], [3, 4], [5, 9], [6, 7], [8, 12], [9, 10]], 'draws': [[1, 4, 1, 3, 5, 1], [4, 0, 1, 3, 2, 1], [3, 4, 1, 1, 3, 3], [3, 0, 4, 2, 0, 4], [5, 1, 5, 0, 2, 5], [4, 0, 0, 4, 2, 1], [3, 3, 2, 0, 0, 3], [5, 5, 5, 2, 1, 3], [0, 1, 5, 5, 4, 0], [2, 4, 3, 2, 1, 2], [1, 5, 5, 1, 5, 0], [0, 4, 4, 1, 4, 3], [3, 3, 5, 0, 3, 5], [5, 1, 2, 5, 0, 4], [0, 3, 1, 3, 1, 1], [5, 5, 3, 5, 1, 4], [1, 5, 0, 0, 4, 5], [1, 0, 1, 2, 2, 3], [2, 1, 3, 0, 3, 1], [1, 4, 5, 0, 1, 4], [0, 2, 3, 3, 4, 2], [2, 4, 5, 4, 3, 0], [5, 0, 3, 1, 5, 0], [1, 2, 3, 2, 5, 2], [5, 2, 4, 2, 1, 0], [4, 3, 2, 4, 5, 5], [1, 4, 0, 5, 0, 3], [2, 1, 3, 3, 5, 3], [3, 2, 2, 5, 2, 4], [5, 2, 4, 2, 4, 2], [2, 1, 5, 5, 4, 0], [2, 5, 2, 2, 4, 1], [0, 5, 3, 4, 3, 3], [0, 1, 1, 3, 4, 3], [0, 3, 5, 0, 1, 4], [1, 1, 3, 0, 3, 2], [1, 3, 0, 0, 5, 5], [3, 5, 5, 0, 3, 4], [5, 4, 4, 0, 3, 5], [0, 1, 2, 5, 2, 2], [4, 1, 0, 1, 1, 0], [5, 4, 1, 0, 2, 5], [1, 2, 5, 4, 5, 5], [2, 5, 1, 2, 3, 3], [5, 4, 1, 1, 5, 5], [3, 1, 4, 1, 5, 5], [1, 3, 4, 2, 3, 5], [1, 3, 5, 2, 0, 5], [0, 5, 0, 0, 3, 2], [0, 2, 5, 2, 0, 1], [0, 4, 5, 0, 4, 2], [0, 3, 4, 1, 2, 3], [2, 1, 1, 0, 5, 0], [5, 3, 2, 4, 1, 0], [1, 1, 3, 0, 2, 3], [4, 3, 1, 2, 0, 1], [5, 5, 5, 1, 1, 0], [3, 3, 5, 5, 5, 5], [3, 3, 1, 1, 3, 5], [2, 3, 0, 0, 2, 2], [5, 5, 2, 0, 4, 5], [2, 3, 1, 3, 2, 0], [5, 1, 5, 3, 4, 0], [3, 0, 5, 1, 1, 2], [1, 5, 3, 0, 1, 3], [2, 0, 3, 3, 4, 0], [2, 4, 5, 3, 5, 0], [1, 3, 2, 0, 3, 1], [0, 2, 2, 0, 1, 0], [2, 2, 4, 2, 4, 0], [0, 3, 1, 0, 4, 3], [3, 2, 3, 4, 4, 5], [2, 0, 0, 0, 2, 4], [3, 3, 4, 4, 2, 1], [4, 2, 2, 4, 2, 3], [4, 3, 3, 4, 0, 3], [3, 1, 1, 4, 3, 1], [4, 4, 5, 0, 2, 5], [5, 0, 2, 2, 1, 5], [4, 4, 2, 5, 0, 1], [4, 3, 4, 1, 4, 0], [0, 5, 5, 5, 2, 4], [4, 1, 1, 2, 4, 0], [4, 5, 2, 1, 4, 5], [4, 5, 5, 2, 2, 3], [5, 0, 2, 5, 4, 3], [0, 3, 0, 5, 4, 1], [3, 0, 0, 1, 4, 2], [2, 4, 0, 4, 0, 5], [5, 2, 4, 2, 1, 0], [2, 3, 3, 1, 4, 0], [1, 2, 3, 0, 1, 5], [1, 0, 0, 5, 0, 1], [0, 0, 5, 5, 1, 1], [2, 0, 0, 1, 0, 5], [1, 0, 5, 0, 5, 1], [1, 4, 4, 1, 3, 5], [5, 4, 4, 4, 1, 0], [5, 2, 0, 2, 5, 3], [0, 2, 2, 2, 0, 2], [1, 3, 3, 0, 5, 3], [5, 0, 5, 5, 0, 5], [3, 0, 5, 4, 5, 0], [2, 3, 4, 3, 2, 3], [0, 4, 4, 5, 1, 2], [2, 4, 4, 3, 3, 4], [4, 5, 1, 0, 5, 1], [4, 3, 2, 4, 1, 0], [1, 4, 5, 5, 2, 5], [3, 2, 5, 2, 2, 2], [0, 2, 2, 5, 5, 5], [5, 0, 1, 3, 2, 4], [2, 0, 1, 3, 5, 3], [4, 2, 1, 1, 2, 4], [5, 4, 3, 1, 1, 5], [5, 4, 2, 1, 0, 3], [5, 2, 3, 3, 2, 3], [0, 4, 4, 1, 3, 2], [4, 1, 2, 4, 2, 2], [0, 1, 5, 4, 3, 2], [4, 0, 3, 1, 4, 5], [1, 5, 1, 0, 5, 3], [5, 3, 1, 2, 5, 0], [1, 5, 5, 0, 2, 2], [3, 0, 1, 4, 0, 1], [4, 1, 1, 3, 5, 4], [5, 2, 3, 4, 3, 1], [5, 4, 3, 3, 0, 2], [2, 5, 4, 2, 3, 2], [3, 1, 4, 2, 3, 0], [5, 0, 3, 3, 0, 2], [2, 3, 1, 5, 5, 4], [5, 0, 2, 5, 0, 3], [1, 4, 0, 4, 5, 4], [5, 0, 1, 4, 2, 4], [5, 3, 4, 4, 0, 4], [0, 1, 4, 0, 5, 3], [2, 5, 1, 1, 0, 2], [5, 0, 5, 2, 2, 1], [5, 4, 1, 5, 5, 1], [2, 5, 1, 5, 3, 2], [5, 5, 3, 1, 4, 0], [4, 3, 1, 5, 0, 2], [0, 5, 4, 4, 1, 0], [3, 3, 3, 3, 3, 0], [2, 0, 0, 5, 2, 0], [1, 5, 1, 4, 4, 1], [5, 2, 3, 2, 4, 5], [2, 1, 5, 1, 5, 2], [5, 1, 3, 0, 0, 5], [4, 0, 0, 1, 4, 3], [5, 4, 5, 0, 5, 3], [5, 5, 1, 5, 1, 0], [2, 2, 5, 4, 5, 5], [2, 5, 3, 5, 1, 1], [0, 0, 3, 2, 3, 1], [1, 2, 0, 3, 4, 4], [4, 5, 5, 3, 2, 0], [4, 4, 5, 1, 3, 1], [1, 5, 0, 5, 1, 2], [2, 1, 2, 0, 1, 4], [2, 1, 0, 1, 0, 2], [3, 1, 4, 4, 5, 3], [1, 5, 3, 1, 3, 4], [4, 1, 3, 1, 0, 4], [3, 4, 1, 2, 2, 2], [3, 0, 0, 3, 0, 0], [3, 0, 4, 1, 0, 2], [0, 0, 3, 5, 5, 2], [3, 5, 2, 0, 4, 0], [1, 4, 1, 5, 5, 2], [0, 2, 0, 3, 4, 3], [2, 1, 2, 0, 1, 5], [4, 2, 5, 5, 5, 1], [4, 0, 3, 4, 5, 0], [4, 3, 2, 0, 3, 3], [2, 5, 2, 3, 5, 2], [0, 3, 5, 0, 2, 4], [4, 5, 2, 2, 2, 5], [4, 2, 5, 4, 3, 1], [3, 0, 0, 0, 1, 2], [4, 4, 2, 1, 5, 0], [5, 5, 5, 4, 1, 3], [4, 1, 1, 0, 2, 5], [3, 2, 4, 5, 2, 3], [5, 0, 3, 3, 4, 3], [5, 1, 3, 4, 5, 0], [3, 0, 2, 3, 0, 4], [4, 0, 0, 5, 0, 0], [1, 5, 5, 3, 2, 3], [5, 5, 3, 2, 3, 4], [5, 3, 4, 2, 5, 2], [1, 5, 3, 2, 5, 0], [1, 4, 5, 0, 5, 0], [4, 3, 1, 2, 2, 5], [5, 2, 3, 4, 4, 5], [1, 4, 4, 5, 0, 0], [4, 1, 3, 5, 1, 4], [2, 4, 2, 1, 1, 3], [4, 3, 4, 3, 3, 2]]}]

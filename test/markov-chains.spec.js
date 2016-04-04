import test from 'tape';
import isEqual from 'is-equal';
import serialize from 'javascript-stringify';

import Chain from '../src';

// private constants & helper functions (imported via babel-plugin-rewire)
const BEGIN = Chain.__get__('BEGIN');
const END = Chain.__get__('END');

const last = Chain.__get__('last');
const createStateKey = Chain.__get__('createStateKey');

// ============================================================================

const corpus = ['foo bar baz qux.', 'foo baz qux bar.'].map((str) => str.split(' '));
const mixedCorpus = [
  [[1, 2, 3], { foo: 'bar' }, 'qux', 0, { end: true }],
  [[1, 2, 3], { foo: 'baz' }, 'qux', 1, { end: true }],
  [[1, 2, 3], { foo: 'bar' }, 'bar', 0, { end: true }],
  [[4, 5, 6], { foo: 'baz' }, 'bar', 1, { end: true }],
];

test('building models from text corpora', (t) => {
  t.plan(2);

  const testModel = Chain.build(corpus, { stateSize: 2 });
  const expectedModel = new Map([
    [createStateKey([BEGIN, BEGIN]), new Map([[serialize('foo'), { value: 'foo', count: 2 }]])],
    [createStateKey([BEGIN, 'foo']), new Map([
      [serialize('bar'), { value: 'bar', count: 1 }],
      [serialize('baz'), { value: 'baz', count: 1 }],
    ])],
    [createStateKey(['foo', 'bar']), new Map([[serialize('baz'), { value: 'baz', count: 1 }]])],
    [createStateKey(['bar', 'baz']), new Map([[serialize('qux.'), { value: 'qux.', count: 1 }]])],
    [createStateKey(['baz', 'qux.']), new Map([[serialize(END), { value: END, count: 1 }]])],
    [createStateKey(['foo', 'baz']), new Map([[serialize('qux'), { value: 'qux', count: 1 }]])],
    [createStateKey(['baz', 'qux']), new Map([[serialize('bar.'), { value: 'bar.', count: 1 }]])],
    [createStateKey(['qux', 'bar.']), new Map([[serialize(END), { value: END, count: 1 }]])],
  ]);

  t.ok(
    testModel instanceof Map,
    'Should return an immutable hash map'
  );

  t.ok(
    isEqual(testModel, expectedModel),
    'Returned object should have expected key-value pairs'
  );
});

// ============================================================================

test('serializing chains', (t) => {
  t.plan(3);

  const original = new Chain(corpus, { stateSize: 2 });
  const serialized = JSON.stringify(original);
  const hydrated = Chain.fromJSON(serialized);

  t.ok(
    typeof serialized === 'string',
    'Chain should be able to be serialized by JSON.stringify'
  );

  t.equal(
    hydrated.stateSize,
    original.stateSize,
    'Hydrated chain should have same state size as original chain'
  );

  t.ok(
    isEqual(hydrated.model, original.model),
    'Hydrated chain should be identical to original chain'
  );
});

// ============================================================================

test('moving on chains (stateSize = 1)', (t) => {
  t.plan(2);

  const testChain = new Chain(corpus);
  const expectedWords = ['bar', 'baz'];

  const steps = [];
  for (let i = 0; i < 255; i++) {
    steps.push(testChain.move('foo'));
  }

  t.ok(
    steps.every((step) => expectedWords.includes(step)),
    'Should only contain possible follow steps'
  );

  // check whether each valid step was actually used. This has the potential to
  // fail, but the chances of doing so are rather low (2 ** -255).
  const wordCounts = steps.reduce((counts, word) => {
    const wordCount = counts[word];
    counts[word] = (wordCount) ? wordCount + 1 : 1;
    return counts;
  }, {});

  t.ok(
    expectedWords.every((word) => wordCounts[word]),
    'Should use every expected word at least once'
  );
});

// ============================================================================

test('moving on chains (stateSize = 2)', (t) => {
  t.plan(2);

  const testChain = new Chain(corpus, { stateSize: 2 });
  const expectedWords = ['bar', 'baz'];

  const steps = [];
  for (let i = 0; i < 255; i++) {
    steps.push(testChain.move([BEGIN, 'foo']));
  }

  t.ok(
    steps.every((step) => expectedWords.includes(step)),
    'Should only contain possible follow steps'
  );

  // check whether each valid step was actually used. This has the potential to
  // fail, but the chances of doing so are rather low (2 ** -255).
  const wordCounts = steps.reduce((counts, word) => {
    const wordCount = counts[word];
    counts[word] = (wordCount) ? wordCount + 1 : 1;
    return counts;
  }, {});

  t.ok(
    expectedWords.every((word) => wordCounts[word]),
    'Should use every expected word at least once'
  );
});

// ============================================================================

test('walking chains (string corpus)', (t) => {
  t.plan(3);

  const testChain = new Chain(corpus);

  const walkResult = testChain.walk();
  const firstItems = corpus.map((row) => row[0]);
  const lastItems = corpus.map(last);

  t.ok(
    Array.isArray(walkResult),
    'Walking should return an array'
  );

  t.ok(
    firstItems.includes(walkResult[0]),
    'First item should be a possible first item in corpus'
  );

  t.ok(
    lastItems.includes(last(walkResult)),
    'Last item should be a possible last item in corpus'
  );
});

// ============================================================================

test('walking chains (mixed corpus)', (t) => {
  t.plan(3);

  const testChain = new Chain(mixedCorpus);

  const walkResult = testChain.walk();

  const firstItems = mixedCorpus.map((row) => row[0]);
  const lastItems = mixedCorpus.map(last);

  t.ok(
    Array.isArray(walkResult),
    'Walking should return an array'
  );

  t.ok(
    firstItems.includes(walkResult[0]),
    'First item should be a possible first item in corpus'
  );

  t.ok(
    lastItems.includes(last(walkResult)),
    'Last item should be a possible last item in corpus'
  );
});

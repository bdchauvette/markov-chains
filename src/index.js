import serialize from 'javascript-stringify';

/**
 * Constant used to pad the beginning of runs in a corpus
 *
 * @private
 * @constant
 * @type string
 */
const BEGIN = '@@MARKOV_CHAIN_BEGIN';

/**
 * Constant used to pad the end of runs in a corpus
 *
 * @private
 * @constant
 * @type string
 */
const END = '@@MARKOV_CHAIN_END';

/**
 * The default state size
 *
 * @private
 * @constant
 * @type number
 */
const DEFAULT_STATE_SIZE = 1;

// ============================================================================

/**
 * A Markov chain representing processes that have both beginnings and ends.
 * For example: Sentences.
 */
export default class Chain {
  constructor(
    corpusOrModel,
    { stateSize = DEFAULT_STATE_SIZE } = {}
  ) {
    this.stateSize = stateSize;

    if (corpusOrModel instanceof Map) {
      this.model = corpusOrModel;
    } else {
      this.model = Chain.build(corpusOrModel, { stateSize });
    }
  }

  /**
   * Creates a Map of Maps where the keys of the outer Map represent all
   * possible states, and point to the inner Map. The inner Maps represent all
   * possibilities for the 'next' item in the chain, along with the count of
   * times it appears.
   *
   * @param {any[][]} corpus The corpus to use to build the chain
   * @param {Object} [opts] Options object
   * @param {number} [opts.stateSize=1] The state size of the object
   * @return {Model}
   */
  static build(
    corpus,
    { stateSize = DEFAULT_STATE_SIZE } = {}
  ) {
    if (!Array.isArray(corpus)) {
      throw new Error('Corpus must be a List or an Array');
    }

    const model = new Map();
    const beginPadding = createBeginState(stateSize);

    for (const run of corpus) {
      if (!Array.isArray(run)) {
        throw new Error('Invalid run in corpus: Must be an array');
      }

      const paddedRun = [...beginPadding, ...run, END];

      // add one to original run size to account for END state.
      for (let ngramStart = 0; ngramStart < run.length + 1; ngramStart++) {
        const ngramEnd = ngramStart + stateSize;

        const stateKey = createStateKey(paddedRun.slice(ngramStart, ngramEnd));
        const follow = paddedRun[ngramEnd];
        const followKey = serialize(follow);

        if (!model.has(stateKey)) {
          model.set(stateKey, new Map());
        }

        const stateMap = model.get(stateKey);

        if (!stateMap.has(followKey)) {
          stateMap.set(followKey, { value: follow, count: 0 });
        }

        const followMap = stateMap.get(followKey);
        followMap.count += 1;
      }
    }

    return model;
  }

  /**
   * Creates a Chain instance by hydrating the model from a JSON string
   *
   * @param {string} jsonData A serialized chain to hydrate
   * @return {Chain} A hydrated Chain instance
   */
  static fromJSON(jsonData) {
    const getStateSize = (stateKey) => JSON.parse(stateKey).length;

    let stateSize;

    const states = JSON.parse(jsonData).map(([stateKey, follow], index) => {
      const currentStateSize = getStateSize(stateKey);

      // Ensure that each state in the chain has a consistent size, as defined
      // by the length of the first hydrated state object
      if (index === 0) {
        stateSize = currentStateSize;
      } else if (currentStateSize !== stateSize) {
        throw new Error(
          'Inconsistent state size. ' +
          `Expected ${stateSize} but got ${currentStateSize} (${stateKey}).`
        );
      }

      const followMap = new Map();

      // Clone the `followData` object so that the garbage collector doesn't
      // keep the temporary hydrated states array laying around because the new
      // chain references objects it contains.
      for (const [followKey, followData] of follow) {
        followMap.set(followKey, Object.assign({}, followData));
      }

      return [stateKey, followMap];
    });

    return new Chain(new Map(states), { stateSize });
  }

  /**
   * Serialize the Chain. Rather than serializing the entire Chain, we only
   * convert its Markov model.
   *
   * Note that this method does not return a string, but a multidimensional
   * array that can be consumed and stringified by `JSON.stringify`. This is
   * the expected behavior of `toJSON` methods.
   *
   * The returned Object will have the shape:
   *
   *   [[stateKey, [[followKey, { value, count }], ...  ]], ...]
   *
   * @see [MDN]{https://mdn.io/stringify#toJSON()_behavior}
   * @see [2ality]{http://www.2ality.com/2015/08/es6-map-json.html}
   */
  toJSON() {
    const serialized = [];

    for (const [state, follow] of this.model) {
      serialized.push([state, [...follow]]);
    }

    return serialized;
  }

  /**
   * Given a state, chooses the next item at random, with a bias towards next
   * states with higher weights
   *
   * @param {any} [fromState] The state to move from
   * @return {any} A next item from the chain
   */
  move(fromState) {
    const stateKey = createStateKey(fromState);
    const state = this.model.get(stateKey);

    if (!state) {
      return undefined;
    }

    const choices = [];
    const weights = [];

    for (const { value, count } of state.values()) {
      choices.push(value);
      weights.push(count);
    }

    const cumulativeDistribution = weights.reduce((cumWeights, currWeight) => {
      const sum = last(cumWeights) || 0;
      return [...cumWeights, (sum + currWeight)];
    }, []);

    const r = Math.random() * last(cumulativeDistribution);
    const randomIndex = bisect(cumulativeDistribution, r);

    const nextMove = choices[randomIndex];

    return nextMove;
  }

  /**
   * Generates successive items until the chain reaches the END state
   *
   * @param fromState {any} [fromState] The state to begin generating from
   * @yield {any} The next item in the chain
   */
  *generate(fromState = createBeginState(this.stateSize)) {
    let state = fromState;

    for (;;) {
      const step = this.move(state);

      if (step === undefined || step === END) {
        return;
      }

      yield step;
      state = [...state.slice(1), step];
    }
  }

  /**
   * Performs a single run of the Markov model, optionally starting from the
   * provided `fromState`
   *
   * @param fromState {any} [fromState] The state to begin generating from
   */
  walk(fromState) {
    const steps = [...this.generate(fromState)];
    return steps;
  }
}

// ============================================================================

/**
 * Creates a state that can be used to look up transitions in the model
 *
 * This method is intended to be passed an array whose length is equal to a
 * chain's `stateSize`, e.g.:
 *
 *   createStateKey(['foo', 'bar']);
 *
 * However, when the `stateSize` is one, it can seem a bit silly to have to
 * pass in an array with a single item. To make things simpler to use, we
 * therefore convert any single, non-array argument to arrays.
 *
 * This has the consequence that if your Chain's stateSize is 1, and you are
 * looking for a state that actually is an array, you need to explicitly wrap
 * it in an outer array, e.g.:
 *
 *   createStatekey([['foobar']]); // -> '"[\'foobar\']"'
 *
 * @private
 * @param {any|any[]} originalState The original state object
 * @return {string} The stringified state object, suitable for use as a Map key
 */
function createStateKey(originalState) {
  const state = (Array.isArray(originalState))
    ? originalState
    : [originalState];

  // Using `JSON.stringify` here allows us to programmatically determine the
  // original `stateSize` when we restore a chain from JSON. If we were to use
  // `serialize`, the stateKey array would be surrounded by single quotes, and
  // would therefore need to be parsed by `eval` in order to determine the
  // original state size. Using JSON.parse is a lot safer than using `eval`.
  return JSON.stringify(state.map(serialize));
}

/**
 * Creates inital `BEGIN` states to use for padding at the beginning of runs
 *
 * @private
 * @param {number} stateSize How many states to create
 */
function createBeginState(stateSize) {
  return new Array(stateSize).fill(BEGIN);
}

/**
 * Gets the last item in an array
 *
 * @private
 * @param {Array} arr The array to take from
 * @return {any}
 */
function last(arr) {
  return arr[arr.length - 1];
}

/**
 * A port of Python's `bisect.bisect_right`, similar to lodash's `sortedIndex`
 */
function bisect(list, num, high = list.length) {
  let currLow = 0;
  let currHigh = high;

  while (currLow < currHigh) {
    const mid = Math.floor((currLow + currHigh) / 2);
    if (num < list[mid]) {
      currHigh = mid;
    } else {
      currLow = mid + 1;
    }
  }

  return currLow;
}

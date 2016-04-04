import serialize from 'javascript-stringify';

/**
 * Constants used to pad states from the beginning and end of a corpus
 */
const BEGIN = '@@MARKOV_CHAIN_BEGIN';
const END = '@@MARKOV_CHAIN_END';

/**
 * The default state size
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
   */
  static build(
    corpus,
    { stateSize = DEFAULT_STATE_SIZE } = {}
  ) {
    if (!Array.isArray(corpus)) {
      throw new Error('Corpus must be a List or an Array');
    }

    const model = new Map();

    corpus.forEach((run) => {
      if (!Array.isArray(run)) {
        throw new Error('Invalid run in corpus: Must be an array');
      }

      const paddedRun = [...createBeginState(stateSize), ...run, END];

      // add one to original run size to account for END state
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
    });

    return model;
  }

  /**
   * Creates a Chain instance by hydrating the model from a JSON string
   */
  static fromJSON(jsonData) {
    const getStateSize = (stateKey) => JSON.parse(stateKey).length;

    let stateSize;

    const states = JSON.parse(jsonData).map(([stateKey, follow]) => {
      const currentStateSize = getStateSize(stateKey);

      // Ensure that each state in the chain has a consistent size
      if (!stateSize) {
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
   * Converts the model to a 2D array, which can then be serialized by
   * JSON.stringify
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
   */
  move(fromState) {
    const stateKey = createStateKey(fromState);
    const state = this.model.get(stateKey);

    if (!state) {
      return undefined;
    }

    const choices = [];
    const weights = [];

    state.forEach((follow) => {
      choices.push(follow.value);
      weights.push(follow.count);
    });

    const cumulativeDistribution = weights.reduce(
      (cumWeights, currWeight) => {
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
   */
  *generate(beginState = createBeginState(this.stateSize)) {
    let state = beginState;

    for (;;) {
      const step = this.move(state);

      if (step === undefined || step === END) {
        break;
      } else {
        yield step;
        state = [...state.slice(1), step];
      }
    }
  }

  /**
   * Performs a single run of the Markov model, optionally starting from the
   * provided `beginState`
   */
  walk(beginState) {
    const steps = [];

    for (const step of this.generate(beginState)) {
      steps.push(step);
    }

    return steps;
  }
}

// ============================================================================

/**
 * Creates a state that can be used to look up transitions in the model
 */
function createStateKey(fromState) {
  // When the `stateSize` is one, it can seem a bit silly to have to pass in an
  // array with a single item. To make things simpler to use, we therefore
  // convert any single, non-array argument to arrays.
  const state = (Array.isArray(fromState))
    ? fromState
    : [fromState];

  // Using `JSON.stringify` here allows us to programmatically determine the
  // original `stateSize` when we restore a chain from JSON. If we were to use
  // `serialize`, the stateKey array would be surrounded by single quotes, and
  // would therefore need to be parsed by `eval` in order to determine the
  // original state size. Using JSON.parse is a lot safer than using `eval`.
  return JSON.stringify(state.map(serialize));
}

/**
 * Creates inital `BEGIN` states to use for padding at the beginning of runs
 */
function createBeginState(stateSize) {
  const beginStates = new Array(stateSize);

  for (let i = 0; i < stateSize; i++) {
    beginStates[i] = BEGIN;
  }

  return beginStates;
}

/**
 * Gets the last item in an array
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

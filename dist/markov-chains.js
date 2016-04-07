'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _javascriptStringify = require('javascript-stringify');

var _javascriptStringify2 = _interopRequireDefault(_javascriptStringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Constant used to pad the beginning of runs in a corpus
 *
 * @private
 * @constant
 * @type string
 */
var BEGIN = '@@MARKOV_CHAIN_BEGIN';

/**
 * Constant used to pad the end of runs in a corpus
 *
 * @private
 * @constant
 * @type string
 */
var END = '@@MARKOV_CHAIN_END';

/**
 * The default state size
 *
 * @private
 * @constant
 * @type number
 */
var DEFAULT_STATE_SIZE = 1;

// ============================================================================

/**
 * A Markov chain representing processes that have both beginnings and ends.
 * For example: Sentences.
 */

var Chain = function () {
  function Chain(corpusOrModel) {
    var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var _ref$stateSize = _ref.stateSize;
    var stateSize = _ref$stateSize === undefined ? DEFAULT_STATE_SIZE : _ref$stateSize;

    _classCallCheck(this, Chain);

    this.stateSize = stateSize;

    if (corpusOrModel instanceof Map) {
      this.model = corpusOrModel;
    } else {
      this.model = Chain.build(corpusOrModel, { stateSize: stateSize });
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


  _createClass(Chain, [{
    key: 'toJSON',


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
    value: function toJSON() {
      var serialized = [];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.model[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _slicedToArray(_step.value, 2);

          var state = _step$value[0];
          var follow = _step$value[1];

          serialized.push([state, [].concat(_toConsumableArray(follow))]);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
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

  }, {
    key: 'move',
    value: function move(fromState) {
      var stateKey = createStateKey(fromState);
      var state = this.model.get(stateKey);

      if (!state) {
        return undefined;
      }

      var choices = [];
      var weights = [];

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = state.values()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _step2$value = _step2.value;
          var value = _step2$value.value;
          var count = _step2$value.count;

          choices.push(value);
          weights.push(count);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      var cumulativeDistribution = weights.reduce(function (cumWeights, currWeight) {
        var sum = last(cumWeights) || 0;
        return [].concat(_toConsumableArray(cumWeights), [sum + currWeight]);
      }, []);

      var r = Math.random() * last(cumulativeDistribution);
      var randomIndex = bisect(cumulativeDistribution, r);

      var nextMove = choices[randomIndex];

      return nextMove;
    }

    /**
     * Generates successive items until the chain reaches the END state
     *
     * @param fromState {any} [fromState] The state to begin generating from
     * @yield {any} The next item in the chain
     */

  }, {
    key: 'generate',
    value: function* generate() {
      var fromState = arguments.length <= 0 || arguments[0] === undefined ? createBeginState(this.stateSize) : arguments[0];

      var state = fromState;

      for (;;) {
        var step = this.move(state);

        if (step === undefined || step === END) {
          return;
        }

        yield step;
        state = [].concat(_toConsumableArray(state.slice(1)), [step]);
      }
    }

    /**
     * Performs a single run of the Markov model, optionally starting from the
     * provided `fromState`
     *
     * @param fromState {any} [fromState] The state to begin generating from
     */

  }, {
    key: 'walk',
    value: function walk(fromState) {
      var steps = [].concat(_toConsumableArray(this.generate(fromState)));
      return steps;
    }
  }], [{
    key: 'build',
    value: function build(corpus) {
      var _ref2 = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var _ref2$stateSize = _ref2.stateSize;
      var stateSize = _ref2$stateSize === undefined ? DEFAULT_STATE_SIZE : _ref2$stateSize;

      if (!Array.isArray(corpus)) {
        throw new Error('Corpus must be a List or an Array');
      }

      var model = new Map();
      var beginPadding = createBeginState(stateSize);

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = corpus[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var run = _step3.value;

          if (!Array.isArray(run)) {
            throw new Error('Invalid run in corpus: Must be an array');
          }

          var paddedRun = [].concat(_toConsumableArray(beginPadding), _toConsumableArray(run), [END]);

          // add one to original run size to account for END state.
          for (var ngramStart = 0; ngramStart < run.length + 1; ngramStart++) {
            var ngramEnd = ngramStart + stateSize;

            var stateKey = createStateKey(paddedRun.slice(ngramStart, ngramEnd));
            var follow = paddedRun[ngramEnd];
            var followKey = (0, _javascriptStringify2.default)(follow);

            if (!model.has(stateKey)) {
              model.set(stateKey, new Map());
            }

            var stateMap = model.get(stateKey);

            if (!stateMap.has(followKey)) {
              stateMap.set(followKey, { value: follow, count: 0 });
            }

            var followMap = stateMap.get(followKey);
            followMap.count += 1;
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
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

  }, {
    key: 'fromJSON',
    value: function fromJSON(jsonData) {
      var getStateSize = function getStateSize(stateKey) {
        return JSON.parse(stateKey).length;
      };

      var stateSize = void 0;

      var states = JSON.parse(jsonData).map(function (_ref3, index) {
        var _ref4 = _slicedToArray(_ref3, 2);

        var stateKey = _ref4[0];
        var follow = _ref4[1];

        var currentStateSize = getStateSize(stateKey);

        // Ensure that each state in the chain has a consistent size, as defined
        // by the length of the first hydrated state object
        if (index === 0) {
          stateSize = currentStateSize;
        } else if (currentStateSize !== stateSize) {
          throw new Error('Inconsistent state size. ' + ('Expected ' + stateSize + ' but got ' + currentStateSize + ' (' + stateKey + ').'));
        }

        var followMap = new Map();

        // Clone the `followData` object so that the garbage collector doesn't
        // keep the temporary hydrated states array laying around because the new
        // chain references objects it contains.
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = follow[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var _step4$value = _slicedToArray(_step4.value, 2);

            var followKey = _step4$value[0];
            var followData = _step4$value[1];

            followMap.set(followKey, Object.assign({}, followData));
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        return [stateKey, followMap];
      });

      return new Chain(new Map(states), { stateSize: stateSize });
    }
  }]);

  return Chain;
}();

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


exports.default = Chain;
function createStateKey(originalState) {
  var state = Array.isArray(originalState) ? originalState : [originalState];

  // Using `JSON.stringify` here allows us to programmatically determine the
  // original `stateSize` when we restore a chain from JSON. If we were to use
  // `serialize`, the stateKey array would be surrounded by single quotes, and
  // would therefore need to be parsed by `eval` in order to determine the
  // original state size. Using JSON.parse is a lot safer than using `eval`.
  return JSON.stringify(state.map(_javascriptStringify2.default));
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
function bisect(list, num) {
  var high = arguments.length <= 2 || arguments[2] === undefined ? list.length : arguments[2];

  var currLow = 0;
  var currHigh = high;

  while (currLow < currHigh) {
    var mid = Math.floor((currLow + currHigh) / 2);
    if (num < list[mid]) {
      currHigh = mid;
    } else {
      currLow = mid + 1;
    }
  }

  return currLow;
}

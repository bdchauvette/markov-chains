## markov-chains
**A general purpose markov chain generator for Node and the browser**

[![npm version](https://badge.fury.io/js/markov-chains.svg)](https://badge.fury.io/js/markov-chains)

---

`markov-chains` is a simple, general purpose markov chain generator written in
JavaScript, and designed for both Node and the browser.

Unlike many markov chain generators in JavaScript, `markov-chains` can handle
and generate non-textual data just as easily as it handles text (see
[example](#example)).

## Table of Contents

- [Features](#features)
- [Example](#example)
- [Installation & Usage](#installation--usage)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [See Also](#see-also)
- [License](#license)

---

## Features

- Simple API that's easy to customize
- Chains can be serialized to and hydrated from JSON

[Back to Top ↑](#readme)

---

## Example

```js
import Chain from 'markov-chains';

// our states (an array of arrays)
const states = [
  // week 1
  [
    { temp: 'hot',  weather: 'sunny' },
    { temp: 'hot',  weather: 'cloudy' },
    { temp: 'warm', weather: 'cloudy' },
    { temp: 'warm', weather: 'cloudy' },
    { temp: 'warm', weather: 'rainy' },
    { temp: 'cool', weather: 'cloudy' },
    { temp: 'warm', weather: 'sunny' },
  ],

  // week 2
  [
    { temp: 'warm', weather: 'sunny' },
    { temp: 'warm', weather: 'cloudy' },
    { temp: 'warm', weather: 'cloudy' },
    { temp: 'warm', weather: 'sunny' },
    { temp: 'hot',  weather: 'sunny' },
    { temp: 'hot',  weather: 'sunny' },
    { temp: 'warm', weather: 'sunny' },
  ],

  // etc.
];

// build the chain
const chain = new Chain(states);

// generate a forecast
const forecast = chain.walk();

console.log(forecast);

// Example output:
//
// [ { temp: 'warm', weather: 'sunny' },
//   { temp: 'warm', weather: 'cloudy' },
//   { temp: 'warm', weather: 'rainy' },
//   { temp: 'cool', weather: 'cloudy' },
//   { temp: 'warm', weather: 'sunny' } ]
```

[Back to Top ↑](#readme)

---

## Installation & Usage

### Requirements

`markov-chains` relies on [Maps][] and [Generators][], which are available
natively in Node v4.0 and above, and in modern versions of many browsers.

For a list of JavaScript environments that support these features, see the
[ECMAScript Compatability Table][].

[Maps]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[Generators]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
[ECMAScript Compatability Table]: http://kangax.github.io/compat-table/es6/

### Downloading

```sh
npm install --save markov-chains
```

### Usage (ES6+)

```js
import Chain from 'markov-chains';
const chain = new Chain(/* corpus: Array<Array<any>> */);
```

### Usage (CommonJS)

```js
var Chain = require('markov-chains').default;
var chain = new Chain(/* corpus: Array<Array<any>> */);
```

[Back to Top ↑](#readme)

---

## API Reference

```
Coming Soon
```

[Back to Top ↑](#readme)

---

## Contributing

Pull requests are always welcome!

### Building

The following `npm` scripts are available for use during development:

Command                    | Use to...
---------------------------|-----------
`npm run clean`            | Remove the `dist/` files
`npm run lint`             | Lint the files in `src/`
`npm run build`            | Transpile the code with `babel`

### Tests

`markov-chains` uses [`tape`](https://github.com/substack/tape) for testing.

To run the tests, just run `npm test` at the command line.

[Back to Top ↑](#readme)

---

## See Also

- [`markovify`](https://github.com/jsvine/markovify) - The excellent python
  library that inspired `markov-chains`
- [`markovchain`](https://www.npmjs.com/package/markovchain)
- [`general-markov`](https://github.com/swang/markovchain)
- [`markov`](https://github.com/substack/node-markov)

[Back to Top ↑](#readme)

---

## License
`markov-chains` is licensed under the MIT License.

For details, please see the [`LICENSE`](https://raw.githubusercontent.com/bdchauvette/markov-chains/master/LICENSE) file.

[Back to Top ↑](#readme)

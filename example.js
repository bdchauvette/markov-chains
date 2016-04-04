const Chain = require('markov-chains').default;

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

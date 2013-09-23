/**
 * engine.js
 * ---------
 * What makes futures work
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * To avoid starvation of the event loop,
 * we use `setImmediate` once every `maxLoops` calls.
 */
var maxLoops = 2000;
var loops = 0;

/**
 * Curried version of `process.nextTick`.
 * Very usefull if you need to pass arguments.
 * Usage: `nextTick(callback)(arg1, arg2, ...)`
 */
var nextTick = function(callback) {
  return function() {
    var args = arguments;
    process.nextTick(function() {
      callback.apply(null, args)
    })
  }
};

/**
 * This function is like `nextTick`, but we allow the events
 * to be processed using `setImmediate` to let them reach the
 * the call stack.
 * Usage: `asap(callback)(arg1, arg2, ...)`
 */
var asap = function(callback) {
  return function() {
    var args = arguments;
    if (loops++ > maxLoops) {
      loops = 0;
      setImmediate(function() {
        callback.apply(null, args)
      })
    } else {
      process.nextTick(function() {
        callback.apply(null, args)
      })
    }
  }
};

/**
 * Export API
 */
exports.nextTick = nextTick;
exports.asap = asap;

/**
 * future-seq.js
 * -------------
 * Sequential operations on futures
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * Dependencies
 */
var future = require('./future');
var Future = future.Future;
var engine = require('./engine');
var asap = engine.asap;

/**
 * Directly export into Future class
 */
Future.seq = {};

/**
 * Returns a future that completes when all the arguments have
 * completed. This future never fails and computes an array that
 * contains all the `(err, res)` values of its arguments.
 * The futures are computed in sequence.
 */
var waitForAll = function() {
  var args = Array.apply(null, arguments);
  if (args.length == 0) {
    return new Future([]);
  } else {
    var fx = args[0];
    args.shift();
    return fx.bind2(function(err, res) {
      return waitForAll.apply(null, args).map(function(ys) {
        ys.unshift([err, res]);
        return ys
      })
    })
  }
};
Future.seq.waitForAll = waitForAll;

/**
 * Like `waitForAll`, but will yield an array of all values or fail if one of
 * its arguments fails.
 */
var all = function() {
  var args = Array.apply(null, arguments);
  if (args.length == 0) {
    return new Future([]);
  } else {
    var fx = args[0];
    args.shift();
    return fx.bind(function(x) {
      return all.apply(null, args).map(function(ys) {
        ys.unshift(x);
        return ys
      })
    })
  }
};
Future.seq.all = all;

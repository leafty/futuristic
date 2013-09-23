/**
 * future-par.js
 * -------------
 * Parallel operations on futures
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
Future.par = {};

var all = function() {
  var args = Array.apply(null, arguments);
  return Future.create(function(callback) {
    var count = args.length;
    var results = new Array(count);
    var cb = function(i) {
      return function(err, res) {
        results[i] = [err, res];
        if (--count == 0) {
          asap(callback)(null, results)
        }
      }
    };

    for (var i = 0; i < count; i++) {
      args[i].call(cb(i))
    }
  })
};
Future.par.all = all;

/**
 * Like `all`, but will yield an array of all values or fail if one of
 * its arguments fails.
 */
var allOrFail = function() {
  var args = Array.apply(null, arguments);
  return Future.create(function(callback) {
    var count = args.length;
    var results = new Array(count);
    var pending = true;
    var cb = function(i) {
      return function(err, res) {
        if (pending) {
          if (err) {
            pending = false;
            asap(callback)(err);
          } else {
            results[i] = res;
            if (--count == 0) {
              asap(callback)(null, results)
            }
          }
        }
      }
    };

    for (var i = 0; i < count; i++) {
      args[i].call(cb(i))
    }
  })
};
Future.par.allOrFail = allOrFail;

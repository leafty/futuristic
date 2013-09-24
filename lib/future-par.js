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

var waitForAll = function() {
  var args = Array.apply(null, arguments);
  if (args.length == 0) {
    return new Future([]);
  } else {
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
  }
};
Future.waitForAll = waitForAll;

/**
 * Like `waitForAll`, but will yield an array of all values or fail if one of
 * its arguments fails.
 */
var all = function() {
  var args = Array.apply(null, arguments);
  if (args.length == 0) {
    return new Future([]);
  } else {
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
  }
};
Future.all = all;

/**
 * Waits for the first future that succeeds.
 */
var any = function() {
  var args = Array.apply(null, arguments);
  if (args.length == 0) {
    return Future.fail(new Error('empty any'));
  } else {
    return Future.create(function(callback) {
      var count = args.length;
      var pending = true;
      var cb = function(i) {
        return function(err, res) {
          if (pending) {
            if (err) {
              if (--count == 0) {
                asap (callback)(new Error('all failed'))
              }
            } else {
              pending = false;
              asap(callback)(null, res)
            }
          }
        }
      };

      for (var i = 0; i < count; i++) {
        args[i].call(cb(i))
      }
    })
  }
};
Future.any = any;

/**
 * Waits for the first future that completes.
 */
var first = function() {
  var args = Array.apply(null, arguments);
  if (args.length == 0) {
    return Future.fail(new Error('empty first'));
  } else {
    return Future.create(function(callback) {
      var count = args.length;
      var pending = true;
      var cb = function(i) {
        return function(err, res) {
          if (pending) {
            pending = false;
            asap(callback)(err, res)
          }
        }
      };

      for (var i = 0; i < count; i++) {
        args[i].call(cb(i))
      }
    })
  }
};
Future.first = first;

var timeout = function(fx, milis, error) {
  error = error || new Error('Timeout')
  var timer = (new Future()).delay(milis).bind(function(x) {
    return Future.fail(error)
  });
  return first(fx, timer)
};
Future.timeout = timeout;
Future.prototype.timeout = function(milis, error) {
  return timeout(this, milis, error)
};

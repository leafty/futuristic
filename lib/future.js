/**
 * future.js
 * ---------
 * Future definition
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * Dependencies
 */
var engine = require('./engine');
var asap = engine.asap;
var core = require('./monad-core');
var AddMonad = core.AddMonad;

/**
 * Future
 */
var Future = function(x) {
  this.call = function(callback) {
    asap(callback)(null, x)
  }
};
Future.prototype = new AddMonad();
Future.prototype.constructor = Future;
Future.super_ = AddMonad;

var create = function(f) {
  var x = new Future();
  x.call = f;
  return x
};
Future.create = create;

var fail = function(error) {
  return create(function(callback) {
    asap(callback)(error)
  })
};
Future.fail = fail;

Future.prototype.bind = function(f) {
  var fx = this;
  return create(function(callback) {
    fx.call(function(err, res) {
      if (err) {
        asap(callback)(err)
      } else {
        f(res).call(callback)
      }
    })
  })
};

/**
 * The binding operation for the outer monad.
 */
Future.prototype.bind2 = function(f) {
  var fx = this;
  return create(function(callback) {
    fx.call(function(err, res) {
      f(err, res).call(callback)
    })
  })
};

Future.prototype.then = function(onSuccess, onError) {
  if (typeof onSuccess !== 'function' && typeof onError !== 'function') {
    return this
  }

  if (typeof onError !== 'function') {
    return this.bind(onSuccess)
  }

  var fx = this;
  if (typeof onSuccess !== 'function') {
    return create(function(callback) {
      fx.call(function(err, res) {
        if (err) {
          onError(err).call(callback)
        } else {
          asap(callback)(null, res)
        }
      })
    })
  }

  return create(function(callback) {
    fx.call(function(err, res) {
      if (err) {
        onError(err).call(callback)
      } else {
        onSuccess(res).call(callback)
      }
    })
  })
};

Future.prototype.add = function(fx) {
  return this.then(function(x) {
    return new Future(x)
  }, function(err) {
    return fx
  })
};
Future.prototype.orElse = Future.prototype.add;

Future.prototype.spread = function(f) {
  var fx = this;
  return create(function(callback) {
    fx.call(function(err, res) {
      if (err) {
        asap(callback)(err)
      } else {
        f.apply(null, res).call(callback)
      }
    })
  })
};

var futurize = function(f) {
  return function() {
    var args = Array.apply(null, arguments);
    console.log(args);
    return create(function(callback) {
      asap(function() { f.apply(null, args.concat([callback])) })()
    })
  }
};
Future.futurize = futurize;

var log = function(name) {
  var start = new Date();
  return function(err, res) {
    var end = new Date();
    var time = end - start;
    console.log('');
    console.log('---- ' + name + ' ---');
    console.log('| err: ' + err);
    console.log('| res: ' + res);
    console.log('| time: ' + time + ' ms');
  }
};
Future.log = log;

/**
 * Export Future class
 */
exports.Future = Future;

/**
 * Basic functions for futures
 */

/**
 * To avoid starvation of the event loop,
 * we use `setImmediate` once every `maxLoops` calls.
 */
var maxLoops = 2000;
var loops = 0;

/**
 * Currified version of `process.nextTick`.
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
 * Simple callback to check what your futures evaluates to.
 * Also gives the timing of computation.
 * Usage: `myFuture(log('my future'))`
 */
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

/**
 * Creates a future that evaluates to its argument.
 * As futures form a monad, this is also called `unit`.
 * Usage: `var myFuture = future('hello world')`
 */
var future = function(x) {
  return function(callback) {
    asap(callback)(null, x)
  }
};

/**
 * The binding operation for this monad.
 * Also called `flatMap` in Scala.
 * `f` is of 'type' `a -> Future b`
 * Usage: `var myFuture = bind(someFuture, someFunction)`
 */
var bind = function(fx, f) {
  return function(callback) {
    fx(function(err, res) {
      if (err) {
        asap(callback)(err)
      } else {
        f(res)(callback)
      }
    })
  }
};

/**
 * Converts an unary function of 'type' `a -> b`
 * into one of 'type' `Future a -> Future b`.
 * Usage: `var myFunction = liftM1(someFunction)`
 */
var liftM1 = function(f) {
  return function(fx) {
    return bind(fx, function(x) {
      return future(f(x))
    })
  }
};

/**
 * Like lift but for a binary function.
 */
var liftM2 = function(f) {
  return function(fx, fy) {
    return bind(fx, function(x) {
      return bind(fy, function(y) {
        return future(f(x, y))
      })
    })
  }
};

/**
 * Creates a future that will fail, i.e. give an error
 * to `callback`.
 * `error` has to be a non-true value for it to work.
 * Futures that fail are the zeroes of the future monad.
 * Usage: `var myFuture = fail(myError)`
 */
var fail = function(error) {
  return function(callback) {
    asap(callback)(error)
  }
};

var zero = fail(new Error());

/**
 * Creates a future that computes the left hand side and if that fails,
 * it tries to compute the right hand side.
 * This is the additive operation in the future monad.
 * Usage: `var myFuture = orElse(someFuture, anotherFuture)`
 */
var orElse = function(fx, fy) {
  return function(callback) {
    fx(function(err, res) {
      if (err) {
        fy(callback)
      } else {
        asap(callback)(res)
      }
    })
  }
};

/**
 * Flattens a future future value into a future value.
 * Flatten is of 'type' `Future Future a -> Future a`.
 * Usage: `var myFuture = flatten(futureFutureValue)`
 */
var flatten = function(ffx) {
  return bind(ffx, function(fx) { return fx })
};

/**
 * Used to write functions of 'type' `a -> Future b` that
 * perform tail recursive calls.
 * This enables tail call optimization.
 * Usage: `tailCall(f)(arg1, arg2, ...)`
 */
var tailCall = function(callee) {
  return function() {
    var args = arguments;
    return function(callback) {
      asap(function() {
        callee.apply(null, args)(callback)
      })()
    }
  }
};

/**
 * Future class
 */
var Future = function(x) {};
Future.prototype = new Function();
Future.prototype.constructor = Future;

Future.future = Future.unit = future;
Future.fail = fail;
Future.zero = zero;

Future.prototype.log = function(name) {
  this(log(name))
};
Future.prototype.flatMap = function(f) {
  bind(this, f)
};
Future.prototype.liftM1 = function() {
  liftM1(this)
};
Future.prototype.liftM2 = function() {
  liftM2(this)
};
Future.prototype.orElse = function(fy) {
  orElse(this, fy)
};
Future.prototype.plus = Future.prototype.orElse;
Future.prototype.flatten = function() {
  flatten(this)
};

/**
 * Modify the prototype chain of newly created futures to have the functions defined
 * as methods.
 */
var modifyPrototypeChain = function() {
  future = function(x) {
    var f = function(callback) {
      asap(callback)(null, x)
    };

    f.__proto__ = Future.prototype;
    console.log('hey');

    return f;
  };

  fail = function(error) {
    var f = function(callback) {
      asap(callback)(error)
    };

    f.__proto__ = Future.prototype;

    return f;
  };

  zero = fail(new Error());

  exports.future = exports.unit = future;
  exports.fail = fail;
  exports.zero = zero;

  Future.future = Future.unit = future;
  Future.fail = fail;
  Future.zero = zero;
};

/**
 * Expose API
 */
exports.nextTick = nextTick;
exports.asap = asap;
exports.log = log;
exports.future = exports.unit = future;
exports.bind = exports.flatMap = bind;
exports.liftM1 = liftM1;
exports.liftM2 = liftM2;
exports.fail = fail;
exports.zero = zero;
exports.orElse = exports.plus = orElse;
exports.flatten = flatten;
exports.tailCall = tailCall;
exports.modifyPrototypeChain = modifyPrototypeChain;
exports.Future = Future;

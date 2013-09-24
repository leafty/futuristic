futuristic
==========

Futures for node.js

This is inspired by the read of : [Currying the callback, or the essence of futures…](bjouhier.wordpress.com/2011/04/04/currying-the-callback-or-the-essence-of-futures/)
and [Callbacks are imperative, promises are functional: Node’s biggest missed opportunity](http://blog.jcoglan.com/2013/03/30/callbacks-are-imperative-promises-are-functional-nodes-biggest-missed-opportunity/).

## Status

Experimental

## Install

```bash
npm install futuristic
```

## Futures

Here, a **future** represents a computation that is yet to be performed.
As such a future simply encapsulates a function that takes one argument, a callback,
which is fired when the computation ended.
The callback must be called with two arguments, usually noted `err` and `res`,
that denote the result of the computation.

When we often find this kind of code in javascript:
```js
var doSomethingAsync = function(arg1, arg2, ..., callback) {
  // ...
};

doSomethingAsync(v1, v2, ..., function(err, res) {
  if (err) {
    handle(err);
  } else {
    // ...
  }
});
```
Defining a future, that would become:
```js
var doSomething = function(arg1, arg2, ...) {
  // ... compute a future ...
  return new Future(res);
};

doSomething(function(err, res) {
  if (err) {
    handle(err);
  } else {
    // ...
  }
});
```

Even if javascript has no type system, it can be helpfull to use types to help
reason about what object we expect to receive or pass to functions.
For instance, we could say that the function `first`
```js
var first = function(str) {
  if (str.length === 0) {
    return ''
  } else {
    return str[0]
  }
}
```
has the type `String -> String`.
A future that computes a value of type `a` has the type `Future a`.

## API through examples

First, load futuristic:
```js
var futuristic = require('futuristic');
var Future = futuristic.Future;
// log will be used to display futures
var log = Future.log;
```

### new Future(value)

Creates a future that returns `value`.
```js
var a = new Future('Hello World');
a.call(log('My first future'));
```

### Future.fail(error)

Creates a future that fails with `error` as its error value.
```js
var b = Future.fail(new Error('Oh no!'));
b.call(log('My first failure'));
```

### Future.log(name)
Creates a callback that can be used to check futures.

### Future.futurize(f)
If `f` is an asynchronous function that fires a callback with `res` and `err` as arguments,
it creates a function that creates a future with the same functionality.
```js
var fs = require('fs');
var readFile = Future.futurize(fs.readFile);
readFile('/path/to/a/file').call(log())
```

### Future.create(f)
If `f` is an asynchronous function that takes only a callback as an argument,
it creates a future from it.
```js
var two = Future.create(function(callback) {
  process.nextTick(function() {
    callback(null, 2);
  });
});
two.call(log());
```

### Future#bind(f)

```js
var incr = function(x) {
  return new Future(x+1);
};
var one = new Future(1);
var two = one.bind(incr);
var err = Future.fail(new Error('error'));
var incrErr = err.bind(incr);
two.call(log('two!'));
incrErr.call(log('err'));
```
If `f` is of type `a -> Future b` and `this` is of type `Future a`,
it returns a future of type `Future b` that computes the result
of `f` applied to the future value of `this`.

If `this` results in an error, `f` is ignored and the error is passed along.

### Future#bind2(f)

This is like `bind`, but the function now takes two arguments and is invoked in all cases, not only when `this` succeeds.

```js
var f = function(err, res) {
  if (err) {
    if (err instanceof TypeError) {
      return new Future(0);
    } else {
      return Future.fail(err);  
    }
  } else {
    return new Future(res*res);
  }
};
var a = new Future(3);
var b = Future.fail(new TypeError('b'));
var c = Future.fail(new Error('c'));
a.bind2(f).call(log('a'));
b.bind2(f).call(log('b'));
c.bind2(f).call(log('c'));
```

### Future#then([onSuccess[, onError]])

Using `then` is like using `bind2`, but now you can give two separate functions.
If one of the arguments is not a function, it is replace by one that will just pass the value.
The example for `bind2` can be rewritten as:
```js
var f1 = function(x) {
  return new Future(x*x);
};
var f2 = function(err) {
  if (err instanceof TypeError) {
    return new Future(0);
  } else {
    return Future.fail(err);  
  }
};
var a = new Future(3);
var b = Future.fail(new TypeError('b'));
var c = Future.fail(new Error('c'));
a.then(f1, f2).call(log('1. a'));
b.then(f1, f2).call(log('1. b'));
c.then(f1, f2).call(log('1. c'));

a.then(f1).call(log('2. a'));
b.then(f1).call(log('2. b'));
c.then(f1).call(log('2. c'));

a.then(null, f2).call(log('3. a'));
b.then(null, f2).call(log('3. b'));
c.then(null, f2).call(log('3. c'));

a.then().call(log('4. a'));
b.then().call(log('4. b'));
c.then().call(log('4. c'));
```

### Future#delay(millis)

Creates a future that will wait `millis` milliseconds before passing the value it received.
If `this` fails, it will not wait though.
```js
var a = (new Future(1)).delay(200);
var b = Future.fail(new Error('error')).delay(300);
a.call(log('a'));
b.call(log('b'));
```

### Future.timeout(millis[, error])

Creates a future that will give only `millis` milliseconds for `this` to complete.
If `error` is specified, then it will be used as the error value.
```js
var a = (new Future(1)).delay(300).timeout(200, new Error('too long'));
var b = (new Future(2)).delay(300).timeout(500);
var c = ((new Future(3)).delay(300).timeout(500)).delay(300);
a.call(log('a'));
b.call(log('b'));
c.call(log('c'));
```

### Future.all([futureA[, futureB[, ...]]])

Creates a future that waits for all futures to succeed and pass all the values.
If one of the futures fails, this will fail too.
```js
var a = (new Future(1)).delay(300);
var b = (new Future(2)).delay(200);
var c = (new Future(3)).delay(700).timeout(100);
Future.all(a, b).call(log('a & b'));
Future.all(a, b, c).call(log('a & b & c'));
Future.all().call(log('nothing?'));
```

### Future.waitForAll([futureA[, futureB[, ...]]])

Creates a future that waits for all futures to succeed or fail and pass all the results.
If will never fail.
```js
var a = (new Future(1)).delay(300);
var b = (new Future(2)).delay(200);
var c = (new Future(3)).delay(700).timeout(100);
Future.waitForAll(a, b).call(log('a & b'));
Future.waitForAll(a, b, c).call(log('a & b & c'));
Future.waitForAll().call(log('nothing?'));
```

### Future#spread(f)

This is like `bind`, but to use after `all` to pass the values as arguments to `f`.
```js
var add = function(x, y) {
  return new Future(x + y);
}
var a = (new Future(1)).delay(300);
var b = (new Future(2)).delay(200);
var c = (new Future(3)).delay(700).timeout(100);
Future.all(a, b).spread(add).call(log('a + b'));
Future.all(a, c).spread(add).call(log('a + c'));
```
It can be used with multi-valued functions also.

### Future.any([futureA[, futureB[, ...]]])

Creates a future that will pass the value of the first future that succeeds.
Fails if empty argument list or all futures fail.
```js
var a = (new Future(1)).delay(300);
var b = (new Future(2)).delay(200);
var c = (new Future(3)).delay(700).timeout(100);
Future.any(a, b, c).call(log('a | b | c'));
Future.any(a, c).call(log('a | c'));
Future.any(c).call(log('c'));
Future.any().call(log('nothing?'));
```

### Future.first([futureA[, futureB[, ...]]])

Creates a future that will pass the value of the first future that completes, wether it succeeds or fails.
```js
var a = (new Future(1)).delay(300);
var b = (new Future(2)).delay(200);
var c = (new Future(3)).delay(700).timeout(100);
Future.first(a, b, c).call(log('a | b | c'));
Future.first(a, b).call(log('a | b'));
Future.first().call(log('nothing?'));
```

## License

MIT (See LICENCE file)

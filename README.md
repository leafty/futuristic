futuristic
==========

Futures for node.js

This is inspired by the read of : [Currying the callback, or the essence of futures…](bjouhier.wordpress.com/2011/04/04/currying-the-callback-or-the-essence-of-futures/)

## Install

```bash
npm install futuristic
```

## Futures

Here, a **future** represents a computation that is yet to be performed.
As such a future is simply a function that takes one argument, a callback,
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
var aFuture = function(arg1, arg2, ...) {
  return function(callback) {
    // ...
  };
};

aFuture(v1, v2, ...)(function(err, res) {
  if (err) {
    handle(err);
  } else {
    // ...
  }
});
```

## Examples

Some examples will help understand what makes futures a fun thing to use.

A very simple future:
```js
var x = future('hello world');

// Let's see what it computes
x(log('my first future'));
```

Want to fail?
```js
var y = fail(new Error());

// Let's see what it computes
x(log('a failed future'));
```

We can start to play with them:
```js
var incr_ = function(x) {
  return x + 1;
};
// Now to use it with futures
var incr = liftM1(incr_);

var a = future(0);
var b = incr(a);

b(log('should be 1'));

var plus_ = function(x, y) {
  return x + y;
};
var plus = liftM2(plus_);

var c = future(5);
var d = plus(b, c);

d(log('should be 6'));
```

You can also write recursive function without the fear of blowing up
the stack.
```js
// isEven and isOdd both take values and return futures.
var isEven = function(x) {
  if (x == 0) {
    return future(true);
  } else {
    return tailCall(isOdd)(x - 1);
  }
};

var isOdd = function(x) {
  if (x == 0) {
    return future(false);
  } else {
    return tailCall(isEven)(x - 1);
  }
};

var a = isEven(1000000);
a(log('is it even?')); // will take some time
```

You may have noticed that you could still interact with the node console while
it computes.

(More to come)

## API

### Futures

Futures form a monad, expect to find your usual functions.

#### nextTick(callback)(arg1, arg2, ...)

Curried version of `process.nextTick`.

#### asap(callback)(arg1, arg2, ...)

Like `nextTick`, but without the event loop starvation.

#### log(name)

Creates a callback you can use to figure out what your futures are doing.
Can be used to time computations too.

#### future(x) = unit(x)

Creates a future that computes the value `x`.

#### fail(error)

Creates a futures that fails to compute and gives `error` to callbacks.
`error` has to be a value that is coerced to `true` for it to work.

#### zero

Minimalist failure.
This monad has many zeroes (all futures that fail), this is just one.

#### bind(fx, f) = flatMap(fx, f)

The binding operation for this monad.

#### liftM1(f)

Transforms `f` a unary function that works on values into one that deals with futures.

#### liftM2(f)

Same as `liftM1` but `f` now takes two arguments.

#### orElse(fx, fy) = plus(fx, fy)

The additive operation for this monad.
Creates a future that computes `x` (the value of the future `fx`)
or the value of `y` if that fails.

#### flatten(fx)

Flattens a future of a future into a future.

#### tailCall(f)(arg1, arg2, ...)

Magic function to write recursive functions that take values as argument and
return futures.
When you find a **tail call** of the form `return f(v1, v2, ...)`, replace that
by `tailCall(f)(v1, v2, ...)`.
Try to modify with `isEven` and `isOdd` to see it in action.

## License

MIT (See LICENCE file)

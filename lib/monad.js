/**
 * monad.js
 * --------
 * Various monad definitions
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

var core = require('./monad-core');
var Monad = core.Monad;
var AddMonad = core.AddMonad;

/**
 * Identity monad
 */
var IdentityMonad = function(x) {
  this.value = x;
};
IdentityMonad.prototype = new Monad();
IdentityMonad.prototype.constructor = IdentityMonad;

IdentityMonad.prototype.bind = function(f) {
  return f(this.value);
};

/**
 * Option monad
 */
var Option = function(x) {
  this.value = x;
};
Option.prototype = new AddMonad();
Option.prototype.constructor = Option;

/**
 * Zero element
 */
var none = new Option();
delete none.value;
none.none = true;

Option.none = none;

Option.prototype.bind = function(f) {
  if (this.none) {
    return none;
  } else {
    return f(this.value);
  }
};

Option.prototype.add = function(mx) {
  if (this.none) {
    return mx;
  } else {
    return this;
  }
};

/**
 * Exception monad
 */
var Exception = function(x) {
  this.value = x;
};
Exception.prototype = new AddMonad();
Exception.prototype.constructor = Exception;

/**
 * Zeroes
 */
Exception.fail = function(error) {
  var x = new Exception();
  delete x.value;
  x.error = error;
  return x;
};
var defError = Exception.fail(new Error('Default error'));
Exception.defError = defError;

Exception.prototype.bind = function(f) {
  if (this.error) {
    return defError;
  } else {
    return f(this.value);
  }
};

Exception.prototype.add = function(mx) {
  if (this.error) {
    return mx;
  } else {
    return this;
  }
};

/**
 * Export classes
 */
exports.IdentityMonad = IdentityMonad;
exports.Option = Option;
exports.Exception = Exception;

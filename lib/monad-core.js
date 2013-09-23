/**
 * monad-core.js
 * -------------
 * Generic monad definitions
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * Monad class represents elements of a monad.
 * unit or return is the class constructor
 * bind is also called flatMap (in particular for container monads)
 */
var Monad = function() {};
Monad.prototype.bind = function(f) {
  throw new Error('not implemented');
};
Monad.prototype.flatMap = function(f) {
  return this.bind(f);
};
Monad.prototype.map = function(f) {
  var Unit = this.constructor;
  return this.bind(function(x) {
    return new Unit(f(x));
  });
};
Monad.prototype.flatten = function() {
  return this.bind(function(x) { return x });
};

/**
 * AddMonad class represents elements of an additive monad.
 * add is the addition in the monad
 */
var AddMonad = function() {};
AddMonad.prototype = new Monad();
AddMonad.prototype.constructor = AddMonad;
AddMonad.super_ = Monad;

AddMonad.prototype.add = function(mx) {
  throw new Error('not implemented');
};

/**
 * Export classes
 */
exports.Monad = Monad;
exports.AddMonad = AddMonad;

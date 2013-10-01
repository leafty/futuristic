/**
 * example1-arith.js
 * -----------------
 * Parser for arithmetical expressions.
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * Dependencies
 */
var parsers = require('./parsers');
var Parser = parsers.Parser;
var input = parsers.InputString.fromString;
var basic = require('./basic_parsers');

var symbol = basic.symbol;
var integer = basic.integer;

/**
 * Arithmetic expressions grammar.
 * Expr -> Expr + Term | Expr - Term | Term ==>
 *     Expr -> Term chainl1 ('+' | '-')
 * Term -> Term * Factor | Factor ==> Term -> Factor chainl1 '*'
 * Factor -> (Expr) | Int
 */

/**
 * Operators
 */
var plus = function(x, y) {
  return x + y
};
var sub = function(x, y) {
  return x - y
};
var mul = function(x, y) {
  return x * y
};

/**
 * Parsers, from bottom to top
 */
// This one refers to net yet defined parsers, hence the trick.
var factor = new Parser(function(input) {
  return symbol('(').seqr(expr).seql(symbol(')')).or(integer).parse(input)
});

var term = factor.chainl1(symbol('*').val(mul));

var expr = term.chainl1(symbol('+').val(plus).or(symbol('-').val(sub)));

exports.expr = expr;

/**
 * basic_parsers.js
 * ----------------
 * Basic parsers.
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * Dependencies
 */
var futuristic = require('../../lib');
var Future = futuristic.Future;
var future = function(x) {
  return new Future(x)
};
var fail = Future.fail;
var parsers = require('./parsers');
var Parser = parsers.Parser;
var ParserResult = parsers.ParserResult;
var result = Parser.result;

/**
 * Consumes a char
 */
var item = new Parser(function(input) {
  if (input.head === null) {
    return fail({
      expected: 'any char',
      found: 'end of input',
      pos: input.pos
    })
  } else {
    return future(new ParserResult(
      input.head,
      input.head,
      input.pos,
      input.tail
    ))
  }
});

/**
 * A char that verifies f
 */
var sat = function(f, expected) {
  return item.guard(f, expected);
};

/**
 * Returns a parser that only accepts char x
 */
var char = function(x) {
  return sat(function(y) { return x === y }, x)
};

/**
 * Parser for digits
 */
var digit = sat(function(x) {
  return '0' <= x && x <= '9'
}, 'digit');

/**
 * Parser for lower case ASCII letters
 */
var lower = sat(function(x) {
  return 'a' <= x && x <= 'z'
}, 'lower case ASCII letter');

/**
 * Parser for upper case ASCII letters
 */
var upper = sat(function(x) {
  return 'A' <= x && x <= 'Z'
}, 'upper case letter');

/**
 * Parser for ASCII letters
 */
var letterASCII = lower.or(upper);

/**
 * Parser for white space chars
 */
var whiteSpace = sat(function(x) {
  return /\s/.test(x)
}, 'white space');

/**
 * Parser for non white space chars
 */
var nonWhiteSpace = sat(function(x) {
  return /\S/.test(x)
}, 'non white space');

/**
 * Parser for any char that is not a white space
 * or a digit or is not a delimiter (in del).
 * This is too wide but may be able to manage most of
 * the reasonable stuff.
 */
var letter = function(del) {
  return sat(function(x) {
    return /[^0-9\s]/.test(x) &&
      del.hasOwnProperty(x) === false
  }, 'letter')
};

/**
 * Parser for ASCII alphanumeric chars
 */
var alphanumASCII = letterASCII.or(digit);

/**
 * Parser for alphanumeric chars
 */
var alphanum = function(del) {
  return letter(del).or(digit)
};

/**
 * Parses the exact string str
 */
var string = function(str) {
  if (str.length === 0) {
    return result('')
  } else {
    return char(str[0]).bind(function() {
      return string(str.substr(1)).bind(function() {
        return result(str);
      });
    });
  }
};

/**
 * Parsers for identifiers
 */
var identASCII = letterACII.seq(alphanumASCII.rep()).reduce();
var ident = function(del) {
  return letter(del).seq(alphanum(del).rep()).reduce()
};

/**
 * Parser for natural numbers
 */
var nat = digit.rep1().reduce().map(function(x) {
  return parseInt(x)
});

/**
 * Parser for integers
 */
var int = function() {
  var neg = function(x) { return -x };
  var id = function(x) { return x };

  var op = char('-').val(neg).or(result(id));

  return op.seq(nat).map(function (f, x) {
    return f(x)
  }, true)
}();

/**
 * Parser for string litterals
 */
var stringLit = (function() {
  var quote = char('\'');
  var nonQuote = item.guard(function(x) {
    return x !== '\''
  }, 'non quote');
  var escapedQuote = string('\\\'').val('\'');
  return quote.seqr(
    escapedQuote.or(nonQuote).rep1().reduce().or(
      result(''))).seql(
    quote);
})();

/**
 * Parser for any amount of white spaces
 */
var spaces = whiteSpace.rep();

/**
 * Returns a parser that removes white spaces before
 * apllying p.
 */
var triml = function(p) {
  return spaces.seqr(p)
};

/**
 * Returns a parser that removes white spaces after
 * apllying p.
 */
var trimr = function(p) {
  return p.seql(spaces)
};

/**
 * Applies p and removes white spaces around
 */
var token = function(p) {
  return spaces.seqr(p.seql(spaces))
};

/**
 * Tokenized parser for natural numbers
 */
var natural = token(nat);

/**
 * Tokenized parser for integers
 */
var integer = token(int);

/**
 * Tokenized parser for specific strings
 */
var symbol = function(x) {
  return token(string(x))
};

/**
 * Tokenized parser for identifiers
 */
var identifier = function(del, kw) {
  return token(ident(del).guard(function(x) {
    return kw.hasOwnProperty(x) === false
  }, 'non-reserved word'))
};

/**
 * Tokenized parser for string litterals
 */
var stringLitteral = token(stringLit);

/**
 * Export API
 */
exports.item = item;
exports.sat = sat;
exports.char = char;

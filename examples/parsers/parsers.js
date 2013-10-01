/**
 * parsers.js
 * ----------
 * Parser combinators implementation using futures.
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

/**
 * Input to feed the parsers
 * Basically a linked list with char position.
 */
var InputString = function(head, tail, pos) {
  this.head = head;
  this.tail = tail;
  this.pos = pos;
};

/**
 * Creates an input from a string
 */
InputString.fromString = function(str) {
  var input = new InputString(null, null, str.length);
  for (var i = str.length - 1; i >= 0; i--) {
    input = new InputString(str[i], input, i)
  }
  return input;
};

/**
 * Parser result (success)
 * Contains:
 *  - object returned by the parser
 *  - matched input string
 *  - starting position of matched input
 *  - next is the input not consumed by the parser 
 */
var ParserResult = function(res, matched, pos, next) {
  this.res = res;
  this.matched = matched;
  this.pos = pos;
  this.next = next;
};

/**
 * Parser
 * parse: the parsing function of this parser.
 * parse is of type: Input -> Future a
 */
var Parser = function(parse) {
  this.parse = parse;
};

var result = function(value) {
  return new Parser(function(input) {
    return future(new ParserResult(value, '', input.pos, input))
  })
};
Parser.result = result;

/**
 * Bind operation of this monad
 * This is the hidden magic.
 * fq function that takes one argument and returns a parser.
 */
Parser.prototype.bind = function(fq) {
  var p = this;
  return new Parser(function(input) {
    return p.parse(input).bind(function(prx) {
      return fq(prx.res).parse(prx.next).bind(function(pry) {
        return future(new ParserResult(
          pry.res,
          prx.matched + pry.matched,
          prx.pos,
          pry.next
        ))
      })
    })
  })
};

/**
 * Sequential combination
 */
Parser.prototype.seq = function(q) {
  return this.bind(function(x) {
    return q.bind(function(y) {
      return result([x, y])
    })
  })
};

/**
 * Sequential combination, only keeps left result
 */
Parser.prototype.seql = function(q) {
  return this.bind(function(x) {
    return q.bind(function(y) {
      return result(x)
    });
  });
};

/**
 * Sequential combination, only keeps right result
 */
Parser.prototype.seqr = function(q) {
  return this.bind(function(x) {
    return q.bind(function(y) {
      return result(y)
    });
  });
};

/**
 * Guard a parser with a predicate
 * f predicate
 * expected string explaining what f is testing,
 * used for debugging
 */
Parser.prototype.guard = function(f, expected) {
  var p = this;
  return new Parser(function(input) {
    return p.parse(input).bind(function(pr) {
      if (f(pr.res)) {
        return future(pr)
      } else {
        return fail({ expected: expected, found: pr.res, pos: pr.pos })
      }
    })
  })
};

/**
 * Alternative combinator
 * If parser on the left fail, then try the one on the right
 */
Parser.prototype.or = function(q) {
  var p = this;
  return new Parser(function(input) {
    return p.parse(input).then(null, function(errx) {
      return q.parse(input).then(null, function(erry) {
        return fail([errx, erry])
      })
    })
  })
};

/**
 * Repetition combinator
 * Match is the longest possible
 */
Parser.prototype.rep = function() {
  var p = this;
  return this.bind(function(x) {
    return p.rep().bind(function(y) {
      return result([x].concat(y))
    })
  }).or(result([]))
};

/**
 * Repetition combinator, with at least one match
 * Match is the longest possible
 */
Parser.prototype.rep1 = function() {
  var p = this;
  return this.bind(function(x) {
    return p.rep().bind(function(y) {
      return result([x].concat(y))
    })
  })
};

/**
 * Repetition combinator, with a separator and at least matched once
 * Match is the longest possible
 */
Parser.prototype.repsep1 = function(q) {
  var p = this;
  return this.bind(function(x) {
    return q.bind(function(y) {
      return p
    }).rep().bind(function(z) {
      return result([x].concat(z))  
    })
  })
};

/**
 * Repetition combinator, with a separator
 * Match is the longest possible
 */
Parser.prototype.repsep = function(q) {
  return this.repsep1(q).or(result([]))
};

/**
 * Result of parser is discarded and replaced by value
 */
Parser.prototype.val = function(value) {
  return this.bind(function() {
    return result(value)
  })
};

/**
 * Flattens an array as most as possible
 */
var flatten = function(l) {
  if (l instanceof Array) {
    var res = [];
    for (var i = 0; i < l.length; i++) {
      if (l[i] instanceof Array) {
        res = res.concat(flatten(l[i]))
      } else {
        res.push(l[i])
      }
    }
    return res;
  } else {
    return [l]
  }
};

/**
 * Result of parser is applied to f
 * Set flat to true to get flattened arguments,
 * especially after sequencing.
 */
Parser.prototype.map = function(f, flat) {
  if (flat) {
    return this.bind(function(x) {
      return result(f.apply(null, flatten(x)))
    })
  } else {
    return this.bind(function(x) {
      return result(f(x))
    })
  }
};

/**
 * Result of parser is reduced using f,
 * it has to be an non-empty array.
 * f default to +
 */
Parser.prototype.reduce = function(f) {
  if (typeof f !== 'function') {
    f = function(x, y) {
      return x + y
    }
  }

  return this.map(function() {
    var args = Array.apply(null, arguments);
    return args.reduce(f)
  }, true)
};

/**
 * Variant of repsep1 where the separator has to return
 * an operator used to reduce the repeted output.
 * This one folds from the left
 * (to use with left associative operators).
 */
Parser.prototype.chainl1 = function(op) {
  var p = this;
  var rest = function(x) {
    return op.bind(function(f) {
      return p.bind(function(y) {
        return rest(f(x, y))
      })
    }).or(result(x))
  };

  return this.bind(rest);
};

/**
 * Variant of repsep1 where the separator has to return
 * an operator used to reduce the repeted output.
 * This one folds from the right
 * (to use with right associative operators).
 */
Parser.prototype.chainr1 = function(op) {
  var p = this;
  var rest = function(x) {
    return op.bind(function(f) {
      return p.bind(function(y) {
        return rest(y).bind(function(z) {
          return result(f(x, z))
        })
      })
    }).or(result(x))
  };

  return this.bind(rest);
};

/**
 * Export API
 */
exports.InputString = InputString;
exports.ParserResult = ParserResult;
exports.Parser = Parser;


// Expr -> Expr + Term | Term ==> Expr -> Term chainl1 '+'
// Term -> Term * Factor | Factor ==> Term -> Factor chainl1 '*'
// Factor -> (Expr) | Int | Var

var my_s = symbol;
var my_id = identifier([]);
var my_in = integer;

var un_node = function(name) {
  return function(a) {
    return {
      node: name,
      child: a
    };
  };
};

var bin_node = function(name) {
  return function(a, b) {
    return {
      node: name,
      left: a,
      right: b
    };
  };
};

var add = bin_node('add');
var sub = bin_node('sub');
var mul = bin_node('mul');
var variable = un_node('var');
var pow = bin_node('pow');

var expr = new Parser(function(inp) {
  return term.chainl1(my_s("+").val(add).or(my_s("-").val(sub))).f(inp);
});

var term = new Parser(function(inp) {
  return fact.chainl1(my_s("*").val(mul)).f(inp)
});

var fact = new Parser(function(inp) {
  return exp.chainr1(my_s("^").val(pow)).f(inp)
});

var exp = my_s("(").seqr(expr).seql(my_s(")")).or(
  my_in).or(
  my_id.map(variable));

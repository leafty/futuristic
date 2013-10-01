/**
 * parser.js
 * ---------
 * Parser implementation using futures.
 * Author: Johann-Michael Thiebaut <johann.thiebaut@gmail.com>
 */

/**
 * Dependencies
 */
var futuristic = require('../lib');
var Future = futuristic.Future;
var future = function(x) {
  return new Future(x)
};
var fail = Future.fail;
// var asap = futuristic.engine.asap;

/**
 * Input to feed the parsers.
 * 
 */
var InputString = function(head, tail, pos) {
  this.head = head;
  this.tail = tail;
  this.pos = pos;
};

InputString.fromString = function(str) {
  var input = new InputString(null, null, str.length);
  for (var i = str.length - 1; i >= 0; i--) {
    input = new InputString(str[i], input, i)
  }
  return input;
};

/**
 * Parser result.
 */
var ParserResult = function(res, matched, pos, next) {
  this.res = res;
  this.matched = matched;
  this.pos = pos;
  this.next = next;
};

var Parser = function(f) {
  this.f = f;
};

var result = function(v) {
  return new Parser(function(inp) {
    return future(new ParserResult(v, '', inp.pos, inp))
  })
};
Parser.result = result;

// var zero = new Parser(function(x) {
//   return fail('zero')
// });

// var failure = function(err) {
//   return new Parser(function(inp) {
//     return fail(err)
//   })
// };

Parser.prototype.bind = function(fq) {
  var p = this;
  return new Parser(function(inp) {
    return p.f(inp).bind(function(pr) {
      return fq(pr.res).f(pr.next).bind(function(pr2) {
        return future(new ParserResult(pr2.res, pr.matched + pr2.matched, pr.pos, pr2.next))
      })
    })
  })
};

var item = new Parser(function(inp) {
  if (inp.head === null) {
    return fail({ expected: 'any char', found: 'end of input', pos: inp.pos })
  } else {
    return future(new ParserResult(inp.head, inp.head, inp.pos, inp.tail))
  }
});

Parser.prototype.seq = function(q) {
  return this.bind(function(x) {
    return q.bind(function(y) {
      return result([x, y])
    })
  })
};

Parser.prototype.seql = function(q) {
  return this.bind(function(x) {
    return q.bind(function(y) {
      return result(x)
    });
  });
};

Parser.prototype.seqr = function(q) {
  return this.bind(function(x) {
    return q.bind(function(y) {
      return result(y)
    });
  });
};

Parser.prototype.guard = function(f, expected) {
  var p = this;
  return new Parser(function(inp) {
    return p.f(inp).bind(function(pr) {
      if (f(pr.res)) {
        return future(pr)
      } else {
        return fail({ expected: expected, found: pr.res, pos: pr.pos })
      }
    })
  })
};

var sat = function(f, expected) {
  return item.guard(f, expected);
};

var char = function(x) {
  return sat(function(y) { return x === y; }, x);
};

Parser.prototype.or = function(q) {
  var p = this;
  return new Parser(function(inp) {
    return p.f(inp).then(null, function(err1) {
      return q.f(inp).then(null, function(err2) {
        return fail([err1, err2])
      })
    })
  })
};

var digit = sat(function(x) { return '0' <= x && x <= '9'; }, 'digit');

var lower = sat(function(x) { return 'a' <= x && x <= 'z'; }, 'lower case letter');

var upper = sat(function(x) { return 'A' <= x && x <= 'Z'; }, 'upper case letter');

var letter = lower.or(upper);

var alphanum = letter.or(digit);

Parser.prototype.rep = function() {
  var p = this;
  return this.bind(function(x) {
    return p.rep().bind(function(y) {
      return result([x].concat(y))
    })
  }).or(result([]))
};

Parser.prototype.rep1 = function() {
  var p = this;
  return this.bind(function(x) {
    return p.rep().bind(function(y) {
      return result([x].concat(y))
    })
  })
};

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

Parser.prototype.repsep = function(q) {
  return this.repsep1(q).or(result([]))
};

Parser.prototype.val = function(v) {
  return this.bind(function() {
    return result(v)
  })
};

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

var ident = letter.seq(alphanum.rep()).reduce();

var nat = digit.rep1().reduce().map(function(x) {
  return parseInt(x)
});

var int = function() {
  var neg = function(x) { return -x; };
  var id = function(x) { return x; };

  var op = char('-').val(neg).or(result(id));

  return op.seq(nat).map(function (f, x) {
    return f(x)
  }, true)
}();

var spaces = sat(function(x) {
  return x === ' ' || x === '\t' || x === '\r' || x === '\n'
}, 'space').rep().val(null);

var triml = function(p) {
  return spaces.seqr(p)
};

var trimr = function(p) {
  return p.seql(spaces)
};

var token = function(p) {
  return spaces.seqr(p.seql(spaces))
};

var natural = token(nat);

var integer = token(int);

var symbol = function(x) {
  return token(string(x));
};

var identifier = function(kw) {
  return token(ident.guard(function(x) {
    return kw.hasOwnProperty(x) === false;
  }, 'non-reserved word'));
};



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

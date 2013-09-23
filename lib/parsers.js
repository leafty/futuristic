var futures = require('./futures')
var lists = require('./lists')

var input = function(str) {
  var len = str.length;
  var list = null;
  for (var i = len - 1; i >= 0; i--) {
    list = [str[i], list]
  }

  return list;
};

var unit = futures.unit;

// type Parser a = Input -> Future [ Future (a, Input) ]

// result :: a -> Parser a
// result v = \inp -> => [ => (v, inp) ]

var result = function(v) {
  return function(inp) {
    return unit({ head: unit([v, inp]), tail: unit(null) })
  }
};

// zero :: Parser a
// zero = \inp -> => []

var zero = function(inp) {
  return unit(null)
};

// item :: Parser Char
// item = \inp -> case inp of
//                [] -> => []
//                (x :: xs) -> => [ => (x, xs) ]

var item = function(inp) {
  if (inp === null) {
    return unit(null)
  } else {
    return unit({ head: unit(inp), tail: unit(null) })
  }
};

// bind :: Parser a -> (a -> Parser b) -> Parser b
// p `bind` f = \inp -> flatMap (p inp) (\(v, inp') -> f v inp')

var bindp = function(p, f) {
  return function(inp) {
    return lists.flatMap(p(inp), function(x) {
      return f(x[0])(x[1])
    })
  }
};

// seq :: Parser a -> Parser b -> Parser (a, b)
// p `seq` q = p `bind` \x ->
//             q `bind` \y ->
//             result (x, y)

var seq = function(p, q) {
  return bindp(p, function(x) {
    return bindp(q, function(y) {
      return result([x, y])
    })
  })
};

// seql :: Parser a -> Parser b -> Parser a
// p `seql` q = p `bind` \x ->
//              q `bind` \y ->
//              result x

var seql = function(p, q) {
  return bindp(p, function(x) {
    return bindp(q, function(y) {
      return result(x)
    })
  })
};

// seqr :: Parser a -> Parser b -> Parser b
// p `seqr` q = p `bind` \x ->
//              q `bind` \y ->
//              result y

var seqr = function(p, q) {
  return bindp(p, function(x) {
    return bindp(q, function(y) {
      return result(y)
    })
  })
};

// sat :: (Char -> Bool) -> Parser Char
// sat p = item `bind` \x ->
//         if p x then result x else zero

var sat = function(f) {
  return bindp(item, function(x) {
    if (f(x)) {
      return result(x)
    } else {
      return zero
    }
  })
};

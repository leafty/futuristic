var futures = require('./futures');
var Future = futures.Future;

var asap = futures.asap;
var bind = futures.bind;
var unit = futures.unit;

/**
 * Concatenes two future lists.
 * Result is a future list.
 * Usage: `concat(futureList1, futureList2)`
 */
var concat = function(fl1, fl2) {
  return bind(fl1, function(l1) {
    if (l1 === null) {
      return fl2
    } else {
      return unit({ head: l1.head, tail: concat(l1.tail, fl2) })
    }
  })
};

/**
 * Usage: `flatMap(futureList, someFunction)`
 */
var flatMap = function(fl, f) {
  return bind(fl, function(l) {
    if (l === null) {
      return unit(null)
    } else {
      return bind(l.head, function(hd) {
        return concat(f(hd), flatMap(l.tail, f))
      })
    }
  })
};

var zero = unit(null);

var map = function(fl, f) {
  return bind(fl, function(l) {
    if (l === null) {
      return unit(null)
    } else {
      return bind(l.head, function(hd) {
        return unit({ head: f(hd), tail: map(l.tail, f) })
      })
    }
  })
};

var flatten = function(flfl) {
  return flatMap(flfl, function(x) { return unit(x) })
};

var collect_ = function(fl, acc) {
  return function(callback) {
    fl(function(err, res) {
      if (err) {
        asap(callback)(err)
      } else {
        var l = res;
        if (l === null) {
          asap(callback)(null, acc)
        } else {
          l.head(function(err, res) {
            if (err) {
              asap(callback)(err)
            } else {
              var hd = res;
              acc.push(hd);
              asap(function() {
                collect_(l.tail, acc)(callback)  
              })()
            }
          })
        }
      }
   })
  }
};

/**
 * Collects elements of a future list into a future array.
 */
var collect = function(fl) {
  return collect_(fl, [])
};

var show = function(fl) {
  collect(fl)(function(err, res) {
    if (err) {
      console.log(err)
    } else {
      console.log('list: ' + res)
    }
  })
};

/**
 * Export API
 */
exports.concat = concat;
exports.flatMap = flatMap;
exports.map = map;
exports.flatten = flatten;
exports.collect = collect;
exports.show = show;

var engine = require('./engine');
var core = require('./monad-core');
var monad = require('./monad');
var Future = require('./future').Future;
require('./future-seq');
require('./future-par');

var prop;
for(prop in monad) {
  core[prop] = monad[prop];
};

exports.engine = engine;
exports.monads = core;
exports.Future = Future;

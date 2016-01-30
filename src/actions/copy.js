var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'bedrock',
});
var fs = require('fs-extra');
var ejs = require('ejs');
var Q = require('q');


function copy(input) {
  return Q()
    .then(function() {
      process.chdir(input.baseDir);
      log.debug('copying all files from ' + input.source + ' to ' + input.destination);
      if (!input.source) {
        throw new Error('missing source in copy action');
      }
      if (!input.destination) {
        throw new Error('missing destination in copy action');
      }
      fs.copySync(
        ejs.render(input.source, input),
        ejs.render(input.destination, input),
        { clobber: input.clobber }
      );
    })
    .then(function() {
      return input;
    });
}


module.exports = [{
  name: 'copy',
  action: function(input) {
    return copy(input);
  }
}];
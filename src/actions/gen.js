var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'bedrock'
});
var git = require('git-promise');
var Q = require('q');


module.exports = [{
  name: 'genInit',
  action: function(input, host) {
    var workingDir = input.destinationDirectory;
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return Q.Promise(function(resolve, reject, notify) {
        resolve();
      })
      .then(function() {
        return git('init');
      })
      .then(function() {
        return git('checkout -b gen');
      })
      .then(function() {
        return input;
      });
  },
}, {
  name: 'genFinish',
  action: function(input, host) {
    var workingDir = input.destinationDirectory;
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return Q.Promise(function(resolve, reject, notify) {
        resolve();
      })
      .then(function() {
        return git('checkout -b dev');
      });
  }
}];
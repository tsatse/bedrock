var Q = require('q');
var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'bedrock'
});
var exec = require('child_process').exec;


function shellCommand(input, host) {
  return Q()
    .then(function() {
      var workingDir = input.destinationDirectory;
      log.debug('changing directory to ', workingDir);
      process.chdir(workingDir);
      if (!input.command) {
        throw new Error('missing input command for shell command action');
      }
      return Q.Promise(function(resolve, reject, notify) {
        exec(input.command, function(error, stdout, stderr) {
          if (error) {
            reject(error);
            return;
          }
          resolve(input);
        });
      });
    });
}


module.exports = [{
  name: 'shellCommand',
  action: function(input, host) {
    return shellCommand(input, host);
  }
}];
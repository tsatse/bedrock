var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var git = require('git-promise');
var Q = require('q');


module.exports = {
    name: 'genFinish',
    action: function(input, host) {
        var workingDir = host.getWorkingDir(input);
        log.debug('changing directory to ', workingDir);
        process.chdir(workingDir);
        return Q.Promise(function(resolve, reject, notify) {
            resolve();
        })
            .then(function() {
                return git('checkout -b dev');
            });
    }
};

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var git = require('git-promise');
var Q = require('q');


function gitInit(input, host) {
    var workingDir = host.getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return Q.Promise(function(resolve, reject, notify) {
        resolve();
    })
        .then(function() {
            log.debug('running git init');
            return git('init');
        })
        .then(function() {
            log.debug('running git add .');
            return git('add .');
        })
        .then(function() {
            log.debug('running git commit -m "first commit"');
            return git('commit -m "first commit"');
        })
        .then(function() {
            return input;
        });
}


module.exports = {
    name: 'git',
    action: function(input, host) {
        return gitInit(input, host);
    }
};


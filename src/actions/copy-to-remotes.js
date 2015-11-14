var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var path = require('path');
var git = require('git-promise');
var Q = require('q');
var scp = require('scp');
var rimraf = require('rimraf');


function scpPromise(scpParams) {
    return Q.Promise(function(resolve, reject, notify) {
        scp.send(scpParams, function(error) {
            if(error) {
                return reject(error);
            }
            resolve();
        });
    });
}

function copyToRemotes(input, host) {
    var workingDir = host.getWorkingDir(input);
    var projName = path.basename(workingDir);

    log.debug('changing directory to ', path.dirname(workingDir));
    process.chdir(path.dirname(workingDir));

    var gitCommand = 'clone ' + projName + ' --bare';
    log.debug('running ', gitCommand);
    return git(gitCommand)
        .then(function() {
            return Q.all(
                input.remotes.map(function(remoteInfo) {
                    var gitRepo = path.basename(workingDir) + '.git';

                    log.debug('running scp from ', gitRepo, ' to ', remoteInfo.host + ':' + remoteInfo.path);

                    return scpPromise({
                        file: gitRepo,
                        host: remoteInfo.host,
                        path: remoteInfo.path
                    })
                        .then(function() {
                            rimraf.sync(gitRepo);
                        });
                })
            );
        })
        .then(function() {
            return input;
        });
}


module.exports = {
    name: 'copyToRemotes',
    action: function(input, host) {
        return copyToRemotes(input, host);
    }
};

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var npm = require('npm');
var Q = require('q');


function npmInstall(input, host) {
    var workingDir = host.getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return host.npmLoad()
        .then(function() {
            return Q.Promise(function(resolve, reject, notify) {
                npm.commands.install([], function(error) {
                    if(error) {
                        return reject(error);
                    }
                    resolve(input);
                });
            });
        });
}


module.exports = {
    name: 'npmInstall',
    action: function(input, host) {
        return npmInstall(input, host);
    }
};

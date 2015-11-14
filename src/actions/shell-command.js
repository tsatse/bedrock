var Q = require('q');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var exec = require('child_process').exec;


function shellCommand(input, host) {
    var workingDir = host.getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return Q.Promise(function(resolve, reject, notify) {
        exec(input.command, function(error, stdout, stderr) {
            if(error) {
                reject(error);
                return;
            }
            resolve(input);
        });
    });
}


module.exports = {
    name: 'shellCommand',
    action: function(input, host) {
        return shellCommand(input, host);
    }
};

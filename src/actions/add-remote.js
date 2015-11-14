var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var path = require('path');
var git = require('git-promise');
var Q = require('q');



function addRemote(input, host) {
    var workingDir = host.getWorkingDir(input);
    var projName = path.basename(workingDir);

    return Q.all(input.remotes.map(function(remoteInfo) {
        var gitCommand = 'remote add ' + remoteInfo.name + ' ' + remoteInfo.host + ':' + remoteInfo.path + '/' + projName + '.git';
        log.debug('running ', gitCommand);
        return git(gitCommand);
    }))
        .then(function() {
            return input;
        });
}


module.exports = {
    name: 'addRemote',
    action: function(input, host) {
        return addRemote(input, host);
    }
};

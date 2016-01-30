var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'bedrock',
});
var git = require('git-promise');
var Q = require('q');
var path = require('path');
var scp = require('scp');
var rimraf = require('rimraf');


function gitInit(input, host) {
  var workingDir = input.destinationDirectory;
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

function scpPromise(scpParams) {
  return Q.Promise(function(resolve, reject, notify) {
    scp.send(scpParams, function(error) {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

function copyToRemotes(input, host) {
  var workingDir = input.destinationDirectory;
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

function addRemote(input, host) {
  var workingDir = input.destinationDirectory;
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

function gitAdd(input, host) {
  return Q.Promise(function(resolve, reject, notify) {
      var workingDir = input.destinationDirectory;
      log.debug('changing directory to ', workingDir);
      process.chdir(workingDir);
      resolve();
    })
    .then(function() {
      return git('add .');
    })
    .then(function() {
      return input;
    });
}

function gitCommit(input, host) {
  return Q.Promise(function(resolve, reject, notify) {
      var workingDir = input.destinationDirectory;
      log.debug('changing directory to ', workingDir);
      process.chdir(workingDir);
      resolve();
    })
    .then(function() {
      return git('commit -m "' + input.comment + '"');
    })
    .then(function() {
      return input;
    });
}

module.exports = [{
  name: 'addRemote',
  action: function(input, host) {
    return addRemote(input, host);
  }
}, {
  name: 'copyToRemotes',
  action: function(input, host) {
    return copyToRemotes(input, host);
  }
}, {
  name: 'git',
  action: function(input, host) {
    return gitInit(input, host);
  }
}, {
  name: 'gitAdd',
  action: function(input, host) {
    return gitAdd(input, host);
  }
}, {
  name: 'gitCommit',
  action: function(input, host) {
    return gitCommit(input, host);
  }
}];
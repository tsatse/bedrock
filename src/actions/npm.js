var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'bedrock'
});
var npm = require('npm');
var Q = require('q');
var fs = require('fs-extra');
var path = require('path');
var ejs = require('ejs');


function npmInstall(input, host) {
  var workingDir = input.destinationDirectory;
  log.debug('changing directory to ', workingDir);
  process.chdir(workingDir);
  return host.npmLoad()
    .then(function() {
      return Q.Promise(function(resolve, reject, notify) {
        npm.commands.install([], function(error) {
          if (error) {
            return reject(error);
          }
          resolve(input);
        });
      });
    });
}

function npmLink(input, host) {
  var workingDir = input.destinationDirectory;
  log.debug('changing directory to ', workingDir);
  process.chdir(workingDir);
  return host.npmLoad()
    .then(function() {
      return Q.Promise(function(resolve, reject, notify) {
        npm.commands.link([], function(error) {
          if (error) {
            return reject(error);
          }
          resolve(input);
        });
      });
    });
}


function npmCommand(commandName, params) {
  return Q.Promise(function(resolve, reject, notify) {
    npm.commands[commandName](params, function(error) {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

function npmLinkLocals(input, host) {
  var workingDir = input.destinationDirectory;
  log.debug('changing directory to ', workingDir);
  process.chdir(workingDir);
  return host.npmLoad()
    .then(function() {
      var packageJson = JSON.parse(fs.readFileSync(path.join(workingDir, 'package.json')));
      var npmPrefix = npm.config.get("prefix");
      var linkedModulePath = path.join(npmPrefix, 'lib', 'node_modules');
      var linkedModules = fs.readdirSync(linkedModulePath)
        .filter(function(packagePath) {
          var linkStats = fs.lstatSync(path.join(linkedModulePath, packagePath));
          return linkStats.isSymbolicLink();
        });

      var linkCommands = [];
      Object.keys(packageJson.dependencies)
        .forEach(function(packageName) {
          if (linkedModules.indexOf(packageName) !== -1) {
            linkCommands.push(npmCommand('link', [packageName]));
          }
        });
      return Q.all(linkCommands);
    })
    .then(function() {
      return Q(input);
    });
}

function editPackageJson(input, host) {
  return Q()
    .then(function() {
      var workingDir = input.destinationDirectory;
      log.debug('changing directory to ', workingDir);
      process.chdir(workingDir);
      var packageJson = JSON.parse(fs.readFileSync('package.json'));
      input.edits.forEach(function(edit) {
        switch (edit.type) {
          case 'patch':
            if (!packageJson[edit.key]) {
              packageJson[edit.key] = {};
            }
            for (var key in edit.value) {
              packageJson[edit.key][key] = edit.value[key];
            }
            break;
          case 'append':
            if (!packageJson[edit.key]) {
              packageJson[edit.key] = [];
            }
            if (!(edit.value instanceof Array)) {
              edit.value = [edit.value];
            }
            packageJson[edit.key] = packageJson[edit.key].concat(edit.value);
            break;
        }
      });
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 4));
      return input;
    });
}


module.exports = [{
    name: 'editPackageJson',
    action: function(input, host) {
        return editPackageJson(input, host);
    },
  }, {
    name: 'npmLinkLocals',
    action: function(input, host) {
      return npmLinkLocals(input, host);
    },
  }, {
    name: 'npmLink',
    action: function(input, host) {
      return npmLink(input, host);
    },
  }, {
    name: 'npmInstall',
    action: function(input, host) {
      return npmInstall(input, host);
    },
  },
];
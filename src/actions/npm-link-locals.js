var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var npm = require('npm');
var Q = require('q');
var fs = require('fs-extra');
var path = require('path');


function npmCommand(commandName, params) {
    return Q.Promise(function(resolve, reject, notify) {
        npm.commands[commandName](params, function(error) {
            if(error) {
                return reject(error);
            }
            resolve();
        });
    });
}

function npmLinkLocals(input, host) {
    var workingDir = host.getWorkingDir(input);
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
                    if(linkedModules.indexOf(packageName) !== -1) {
                        linkCommands.push(npmCommand('link', [packageName]));
                    }
                });
            return Q.all(linkCommands);
        })
        .then(function() {
            return Q(input);
        });
}


module.exports = {
    name: 'npmLinkLocals',
    action: function(input, host) {
        return npmLinkLocals(input, host);
    }
};

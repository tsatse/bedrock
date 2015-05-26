var fs = require('fs');
var path = require('path');

var Q = require('q');
var git = require('git-promise');
var ejs = require('ejs');
var wrench = require('wrench');
var npm = require('npm');
var rimraf = require('rimraf');
var scp = require('scp');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "scaffolder"});

log.level("debug");

renames = {};

function getCommands(transformations) {
    var result = [];
    var command;

    for(var element in transformations) {
        if(element[0] === ':') {
            command = {};
            command.name = element.substr(1);
            command.param = transformations[element];
            result.push(command);
        }
    }
    return result;
}

function getFileSystemElements(transformations) {
    var result = [];
    for(var element in transformations) {
        if(element[0] !== ':') {
            result.push(element);
        }
    }
    return result;
}

function resolveTarget(target) {
    return renames[target] || target;
}

function executeCommand(command, target, templateData) {
    log.debug('executing command ' + command.name + ' on target ', target);
    target = resolveTarget(target);
    switch(command.name) {
        case 'template':
            var outputData = ejs.render(fs.readFileSync(target).toString(), templateData);
            fs.writeFileSync(target, outputData);
            break;

        case 'rename':
            var replacementString = ejs.render(command.param, templateData);
            replacementString = path.join(path.dirname(target), replacementString);
            
            fs.renameSync(target, replacementString);
            renames[target] = replacementString;
            break;

        case 'delete':
            rimraf.sync(target);
            break;

        case 'custom':
            var toExecute = command.param(templateData);
            var name;
            var translatedCommands = [];

            for(name in toExecute) {
                translatedCommands.push({
                    name: name.substr(1),
                    param: toExecute[name]
                });
                log.debug('generating a new command ', command.name, ' with param ', toExecute[name]);
            }
            translatedCommands.forEach(function(customCommand) {
                executeCommand(customCommand, target, templateData);
            });
            break;
    }
}


function npmInstall(options) {
    process.chdir(options.destinationDirectory);
    return Q.Promise(function(resolve, reject, notify) {
        if(options.npmInstall) {
            npm.load({}, function(error) {
                if(error) {
                    console.error(error);
                    return reject(error);
                }
                resolve();
            });
        }
    })
        .then(function() {
            npm.commands.install([], function(error) {
                if(error) {
                    console.error(error);
                    throw error;
                }
                return;
            });
        })
        .then(function() {
            if(options.npmLink) {
                npm.commands.link([], function(error) {
                    if(error) {
                        console.error(error);
                        throw error;
                    }
                });
            }
        });
}

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

function gitInit(options) {
    log.debug('gitInit');
    log.debug('changing directory to ', options.destinationDirectory);
    process.chdir(options.destinationDirectory);
    return Q.Promise(function(resolve, reject, notify) {
        resolve();
    })
        .then(function() {
            if(options.gitInit) {
                log.debug('running git init');
                return git('init');
            }
        })
        .then(function() {
            if(options.gitInit) {
                log.debug('running git add .');
                return git('add .');
            }
        })
        .then(function() {
            if(options.gitInit) {
                log.debug('running git commit -m "first commit"');
                return git('commit -m "first commit"');
            }
        })
        .then(function() {
            if(options.addRemote) {
                var projName = path.basename(options.destinationDirectory);

                return Q.all(options.addRemote.map(function(remoteInfo) {
                    var gitCommand = 'remote add ' + remoteInfo.name + ' ' + remoteInfo.host + ':' + remoteInfo.path + '/' + projName + '.git';
                    log.debug('running ', gitCommand);
                    return git(gitCommand);
                }));
            }
        })
        .then(function() {
            if(options.addRemote) {
                var projName = path.basename(options.destinationDirectory);

                log.debug('changing directory to ', path.dirname(options.destinationDirectory));
                process.chdir(path.dirname(options.destinationDirectory));
                var gitCommand = 'clone ' + projName + ' --bare';
                log.debug('running ', gitCommand);
                return git(gitCommand);
            }
        })
        .then(function() {
            if(options.addRemote) {
                return Q.all(
                    options.addRemote.map(function(remoteInfo) {
                        var gitRepo = path.basename(options.destinationDirectory) + '.git';

                        log.debug('running scp from ', gitRepo, ' to ', remoteInfo.host + ':' + remoteInfo.path);

                        return scpPromise({
                            file: gitRepo,
                            host: remoteInfo.host,
                            path: remoteInfo.path
                        });
                    })
                );
            }
        })
        .catch(function(error) {
            console.log(error);
        });
}

function transform(
    templateData,
    transformations,
    target
) {
    var commands = getCommands(transformations).sort(function(a, b) {return a.name.localeCompare(b.name);});
    var fileSystemElements = getFileSystemElements(transformations);
    
    commands.forEach(function(command) {
        executeCommand(command, target, templateData);
    });

    if(renames[target]) {
        target = renames[target];
    }
    fileSystemElements.forEach(function(fileSystemElement) {
        transform(
            templateData,
            transformations[fileSystemElement],
            path.join(target, fileSystemElement)
        );
    });
}

function generate(options) {
    wrench.copyDirSyncRecursive(
        options.templateDirectory,
        options.destinationDirectory, {
            forceDelete: true
        }
    );
    transform(
        options,
        options.transformations,
        options.destinationDirectory
    );

    if(renames[options.destinationDirectory]) {
        options.destinationDirectory = renames[options.destinationDirectory];
    }

    options.destinationDirectory = path.resolve(options.destinationDirectory);
    gitInit(options)
        .then(function() {
            return npmInstall(options);
        });
}


module.exports = generate;

var fs = require('fs-extra');
var path = require('path');

var Q = require('q');
var git = require('git-promise');
var ejs = require('ejs');
var wrench = require('wrench');
var npm = require('npm');
var rimraf = require('rimraf');
var scp = require('scp');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'scaffolder'});
var prompt = require('cli-prompt');
var exec = require('child_process').exec

log.level('debug');


function executeCommand(command, templateData) {
    log.debug('executing transformation ' + command.name + ' on target ', command.target);
    log.debug(command);
    log.debug(templateData);
    var target = ejs.render(command.target, templateData);
    switch(command.name) {
        case 'template':
            var outputData = ejs.render(fs.readFileSync(target).toString(), templateData);
            fs.writeFileSync(target, outputData);
            break;

        case 'rename':
            var replacementString = ejs.render(command.param, templateData);
            replacementString = path.join(path.dirname(target), replacementString);
            
            fs.renameSync(target, replacementString);
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
                    param: toExecute[name],
                    target: target
                });
                log.debug('generating a new command ', command.name, ' with param ', toExecute[name]);
            }
            translatedCommands.forEach(function(customCommand) {
                executeCommand(customCommand, templateData);
            });
            break;
    }
}


function npmLoad() {
    return Q.Promise(function(resolve, reject, notify) {
        npm.load({}, function(error) {
            if(error) {
                return reject(error);
            }
            resolve();
        });
    });
}

function npmInstall(input) {
    var workingDir = getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return npmLoad()
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

function npmLink(input) {
    var workingDir = getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return npmLoad()
        .then(function() {
            return Q.Promise(function(resolve, reject, notify) {
                npm.commands.link([], function(error) {
                    if(error) {
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
            if(error) {
                return reject(error);
            }
            resolve();
        });
    });
}

function npmLinkLocals(input) {
    var workingDir = getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    return npmLoad()
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

function shellCommand(input) {
    var workingDir = getWorkingDir(input);
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

function gitInit(input) {
    var workingDir = getWorkingDir(input);
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

function addRemote(input) {
    var workingDir = getWorkingDir(input);
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

function getWorkingDir(input) {
    var result = input.workingDir || '.';
    result = ejs.render(result, input);
    result = path.resolve(input.baseDir, result);
    return result;
}

function copyToRemotes(input) {
    var workingDir = getWorkingDir(input);
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

function getFileSystemElements(transformations) {
    var result = [];
    for(var element in transformations) {
        if(element[0] !== ':') {
            result.push(element);
        }
    }
    return result;
}

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

function myBaseDir(path) {
    return path.substr(0, path.lastIndexOf('/'));
}

function transformationsTreeToArray(transformations, target) {
    var commands = getCommands(transformations).sort(function(a, b) {return a.name.localeCompare(b.name);});
    var fileSystemElements = getFileSystemElements(transformations);
    
    commands.forEach(function(command) {
        command.target = target;
        if(command.name === 'rename') {
            target = path.join(myBaseDir(target), command.param);
        }
    });

    fileSystemElements.forEach(function(fileSystemElement) {
        commands = commands.concat(
            transformationsTreeToArray(
                transformations[fileSystemElement],
                path.join(target, fileSystemElement)
                )
        );
    });
    return commands;
}

function copy(input) {
    log.debug('copying all files from ' + input.source + ' to ' + input.destination);
    fs.copySync(
        ejs.render(input.source, input),
        ejs.render(input.destination, input)
    );
    return Q(input);
}

function transform(input) {
    var transformations = input.transformations;
    if(!(transformations instanceof Array)) {
        transformations = transformationsTreeToArray(transformations, input.target);
    }
    else {
        transformations = transformations.map(function(transformation) {
            var model = getCommands(transformation.transformation)[0];
            transformation.name = model.name;
            transformation.param = model.param;
            delete transformation.transformation;
            return transformation;
        });
    }
    transformations.forEach(function(transformation) {
        executeCommand(transformation, input);
    });
    return Q(input);
}

function editPackageJson(input) {
    var workingDir = getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    var target = ejs.render(input.target, input);
    var packageJson = JSON.parse(fs.readFileSync(target));
    input.edits.forEach(function(edit) {
        switch(edit.type) {
            case 'patch':
                if(!packageJson[edit.key]) {
                    packageJson[edit.key] = {};
                }
                for(var key in edit.value) {
                    packageJson[edit.key][key] = edit.value[key];
                }
                break;
            case 'append':
                if(!packageJson[edit.key]) {
                    packageJson[edit.key] = [];
                }
                if(!(edit.value instanceof Array)) {
                    edit.value = [edit.value];
                }
                packageJson[edit.key] = packageJson[edit.key].concat(edit.value);
                break;
        }
    });
    fs.writeFileSync(target, JSON.stringify(packageJson, null, 4));
    return Q(input);
}

function getEmptyPromptAction() {
    return {
        actionType: 'prompt',
        sequence: []
    };
}

function parseProgram(program) {
    var realActions = [];
    var currentPromptAction = getEmptyPromptAction();

    program.forEach(function(action) {
        if(action.actionType === 'prompt') {
            currentPromptAction.sequence.push(action);
        }
    });

    if(currentPromptAction.sequence.length) {
        realActions.push(currentPromptAction);
    }

    program.forEach(function(action) {
        if(action.actionType !== 'prompt') {
            if(!action.actionType && typeof(action) === 'object') {
                action.actionType = 'data';
            }
            else if(typeof action === 'function') {
                action = {
                    actionType: 'function',
                    func: action
                };
            }
            realActions.push(action);
        }
    });

    return realActions;
}

function updateObject(target, patch, options) {
    var result = {};
    var propertyName;
    var omit = options && options.omit || [];

    for(propertyName in target) {
        if(omit.indexOf(propertyName) === -1) {
            result[propertyName] = target[propertyName];
        }
    }
    for(propertyName in patch) {
        if(omit.indexOf(propertyName) === -1) {
            result[propertyName] = patch[propertyName];
        }
    }
    return result;
}

var actionPromises = {
    'prompt': function(input) {
        return Q.Promise(function(resolve, reject, notify) {
            prompt.multi(input.sequence, function(enteredData) {
                var updatedData = updateObject(input, enteredData);
                resolve(updatedData);
            });
        });
    },

    'function': function(input) {
        return Q(input.func(input));
    },

    'copy': function(input) {
        return copy(input);
    },

    'transform': function(input) {
        return transform(input);
    },

    'data': function(input) {
        return Q(input);
    },

    'git': function(input) {
        return gitInit(input);
    },

    'addRemote': function(input) {
        return addRemote(input);
    },

    'copyToRemotes': function(input) {
        return copyToRemotes(input);
    },

    'npmInstall': function(input) {
        return npmInstall(input);
    },

    'npmLink': function(input) {
        return npmLink(input);
    },

    'npmLinkLocals': function(input) {
        return npmLinkLocals(input);
    },

    'editPackageJson': function(input) {
        return editPackageJson(input);
    },

    'shellCommand': function(input) {
        return shellCommand(input);
    }
};

function executeProgram(program, inputData) {
    inputData = inputData || {};
    var baseData = updateObject(
        inputData,
        {
            baseDir: process.cwd()
        });

    return program.reduce(function (previousPromise, currentAction) {
        return previousPromise.then(function(previousResult) {
            var input = updateObject(previousResult, currentAction, {omit: ['actionType', 'executeIf']});
            if(!currentAction.executeIf || eval(ejs.render(currentAction.executeIf, input))) {
                log.debug('executing command ' + currentAction.actionType);
                return actionPromises[currentAction.actionType](input);
            }
            else {
                return Q(input);
            }
        });
    }, Q(baseData))
        .then(function() {
            log.info('generation complete');
        })
        .catch(function(error) {
            log.error(error);
        });
}

function execute(program, input) {
    var parsedProgram = parseProgram(program);
    log.debug(parsedProgram);
    return executeProgram(parsedProgram, input);
}

function compose(/* arguments */) {
    var composition = [];

    for(var i = 0 ; i < arguments.length ; i++) {
        composition = composition.concat(arguments[i]);
    }
    execute(composition);
}


module.exports = {
    execute: execute,
    compose: compose
// update
};


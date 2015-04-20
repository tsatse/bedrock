var fs = require('fs');
var path = require('path');

var git = require('git-promise');
var ejs = require('ejs');
var wrench = require('wrench');
var npm = require('npm');
var rimraf = require('rimraf');


renames = {};

function getCommands(transformations) {
    var result = [];
    var command;

    for(element in transformations) {
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
    for(element in transformations) {
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
            }
            translatedCommands.forEach(function(customCommand) {
                executeCommand(customCommand, target, templateData);
            });
            break;
    }
}

function npmInstall(options, callback) {
    npm.load({}, function(error) {
        if(error) {
            console.error(error);
            return;
        }
        npm.commands.install([], function(error) {
            if(options.npmLink) {
                npm.commands.link([], callback);
            }
            else {
                callback(error);
            }
        });
    });
}

function gitInit() {
    return git('init')
        .then(function() {
            return git('add .');
        })
        .then(function() {
            return git('commit -m "first commit"');
        })
        .catch(function(error) {
            console.log(error);
        })
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

    fileSystemElements.forEach(function(fileSystemElement) {
        transform(
            templateData,
            transformations[fileSystemElement],
            path.join(target, fileSystemElement)
        );
    })
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

    if(options.gitInit) {
        process.chdir(options.destinationDirectory);
        gitInit(options)
            .then(function() {
                if(options.npmInstall) {
                    npmInstall(options, function(error) {
                        if(error) {
                            console.log(error);
                            return;
                        }
                    });
                }
        });
    }
    else if(options.npmInstall) {
        process.chdir(options.destinationDirectory);
        npmInstall(options, function(error) {
            if(error) {
                console.log(error);
                return;
            }
        });
    }

}


module.exports = generate;

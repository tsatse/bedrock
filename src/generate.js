var fs = require('fs');
var path = require('path');

var ejs = require('ejs');
var wrench = require('wrench');


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
            fs.unlinkSync(target);
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

function generate(
    templateData,
    transformations,
    templateDirectory,
    destination
) {
    wrench.copyDirSyncRecursive(
        templateDirectory,
        destination, {
            forceDelete: true
        }
    );
    transform(
        templateData,
        transformations,
        destination
    );
}


module.exports = generate;

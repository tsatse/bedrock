var Q = require('q');
var fs = require('fs-extra');
var path = require('path');
var ejs = require('ejs');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var rimraf = require('rimraf');


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


module.exports = {
    name: 'transform',
    action: function(input) {
        return transform(input);
    }
};

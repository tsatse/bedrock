var fs = require('fs');
var path = require('path');

var ejs = require('ejs');
var wrench = require('wrench');


function getCommands(transformations) {
    var result = [];
    for(element in transformations) {
        if(element[0] === ':') {
            result.push(element.substr(1));
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

function transform(
    templateData,
    transformations,
    target
) {
    var commands = getCommands(transformations).sort();
    var fileSystemElements = getFileSystemElements(transformations);
    
    commands.forEach(function(command) {
        switch(command) {
            case 'template':
                var outputData = ejs.render(fs.readFileSync(target).toString(), templateData);
                fs.writeFileSync(target, outputData);
                break;
            case 'rename':
                var replacementString = ejs.render(transformations[':' + command], templateData);
                replacementString = path.join(path.dirname(target), replacementString);
                
                fs.renameSync(target, replacementString);
                target = replacementString;
                break;
        }
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

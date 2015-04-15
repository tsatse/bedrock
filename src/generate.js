var fs = require('fs');
var path = require('path');

var ejs = require('ejs');
var wrench = require('wrench');


if(process.argv.length < 4) {
    console.error('missing parameter');
    process.exit();
}

var projectName = process.argv[2];
var destinationDirectory = process.argv[3];


function transform(
    templateData,
    transformations,
    target
) {
    for(var fileElement in transformations) {
        if(fileElement[0] === ':') {
            switch(fileElement.substr(1)) {
                case 'template':
                    var outputData = ejs.render(fs.readFileSync(target).toString(), templateData);
                    fs.writeFileSync(target, outputData);
                    break;
                case 'rename':
                    var replacementString = ejs.render(transformations[fileElement], templateData);
                    replacementString = path.join(path.dirname(target), replacementString);
                    fs.renameSync(target, replacementString);
                    break;
            }
        }
        else {
            transform(
                templateData,
                transformations[fileElement],
                path.join(target, fileElement)
            );
        }
    }
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

var templateData = {
    projectName: projectName,
    author: 'tsatse'
};

transformations = {
    'package.json': {
        ':template': true
    },
    'gruntfile.js': {
        ':template': true
    },
    'src': {
        'source.js': {
            ':rename': '<%= projectName %>-ui.js'
        },
        'template.html': {
            ':rename': '<%=  projectName %>-ui-template.js'
        },
        'styles': {
            'style.css': {
                ':rename': '<%= projectName %>.css'
            }
        }
    }
}

generate(
    templateData,
    transformations,
    path.join(__dirname, 'template'),
    destinationDirectory
);


module.exports = generate;

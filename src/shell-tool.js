#!/usr/local/bin/node

var path = require('path');

var scaffolder = require('@tsatse/scaffolder');


scaffolder.execute([
    {
        actionType: 'prompt',
        key: 'projectName',
        label: 'project name',
        default: 'my-project'
    },
    {
        actionType: 'copy',
        source: path.join(__dirname, '..', 'template'),
        destination: '<%= projectName %>',
        forceDelete: true
    },
    {
        actionType: 'transform',
        target: '<%= projectName %>',
        transformations: {
            'package.json': {
                ':template': true
            },
            'bin': {
                'source.js': {
                    ':rename': '<%= projectName %>.js'
                }
            }
        }
    }
]);

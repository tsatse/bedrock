var path = require('path');

var Q = require('q');
var ejs = require('ejs');
var npm = require('npm');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});


// actions
var actionPromises = {};

registerAction(require('./actions/prompt'));
registerAction(require('./actions/add-remote'));
registerAction(require('./actions/copy-to-remotes'));
registerAction(require('./actions/copy'));
registerAction(require('./actions/data'));
registerAction(require('./actions/edit-package-json'));
registerAction(require('./actions/function'));
registerAction(require('./actions/git'));
registerAction(require('./actions/npm-install'));
registerAction(require('./actions/npm-link-locals'));
registerAction(require('./actions/npm-link'));
registerAction(require('./actions/prompt'));
registerAction(require('./actions/shell-command'));
registerAction(require('./actions/transform'));

log.level('debug');


var host = {
    getWorkingDir: function (input) {
        var result = input.workingDir || '.';
        result = ejs.render(result, input);
        result = path.resolve(input.baseDir, result);
        return result;
    },

    npmLoad: function () {
        return Q.Promise(function(resolve, reject, notify) {
            npm.load({}, function(error) {
                if(error) {
                    return reject(error);
                }
                resolve();
            });
        });
    },

    updateObject: function (target, patch, options) {
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
};


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



function executeProgram(program, inputData) {
    inputData = inputData || {};
    var baseData = host.updateObject(
        inputData,
        {
            baseDir: process.cwd()
        });

    return program.reduce(function (previousPromise, currentAction) {
        return previousPromise.then(function(previousResult) {
            var input = host.updateObject(previousResult, currentAction, {omit: ['actionType', 'executeIf']});
            if(!currentAction.executeIf || eval(ejs.render(currentAction.executeIf, input))) {
                log.debug('executing command ' + currentAction.actionType);
                return actionPromises[currentAction.actionType](input, host);
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

function registerAction(actionData) {
    log.debug('registering action', actionData);
    actionPromises[actionData.name] = actionData.action;
}


module.exports = {
    execute: execute,
    compose: compose,
    registerAction: registerAction
};


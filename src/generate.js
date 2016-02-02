var path = require('path');

var Q = require('q');
var ejs = require('ejs');
var npm = require('npm');
var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'bedrock',
});
var git = require('git-promise');
var fs = require('fs');
var cliPrompt = require('cli-prompt');


// actions
var actionPromises = {};
var initDone = false;
var uncommittedCommands = [];

registerActions(require('./actions/prompt'));
registerActions(require('./actions/copy'));
registerActions(require('./actions/data'));
registerActions(require('./actions/function'));
registerActions(require('./actions/gen'));
registerActions(require('./actions/git'));
registerActions(require('./actions/npm'));
registerActions(require('./actions/prompt'));
registerActions(require('./actions/shell-command'));
registerActions(require('./actions/transform'));
registerActions([{
  name: 'initStep',
  action: _initStep,
}]);
log.level('debug');


var host = {
  getWorkingDir: function(input) {
    if (!input.destinationDirectory) {
      throw new Error('I need a destination directory but none is defined yet');
    }
    var result = path.dirname(input.destinationDirectory);
    return result;
  },

  npmLoad: function() {
    return Q.Promise(function(resolve, reject, notify) {
      npm.load({}, function(error) {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  },

  updateObject: function(target, patch, options) {
    var result = {};
    var propertyName;
    var omit = options && options.omit || [];

    for (propertyName in target) {
      if (omit.indexOf(propertyName) === -1) {
        result[propertyName] = target[propertyName];
      }
    }
    for (propertyName in patch) {
      if (omit.indexOf(propertyName) === -1) {
        result[propertyName] = patch[propertyName];
      }
    }
    return result;
  },
};

function getEmptyPromptAction() {
  return {
    actionType: 'prompt',
    sequence: [],
  };
}

function parseProgram(program) {
  var realActions = [];
  var currentPromptAction = getEmptyPromptAction();

  program.forEach(function(action) {
    if (action.actionType === 'prompt') {
      currentPromptAction.sequence.push(action);
    }
  });

  if (currentPromptAction.sequence.length) {
    realActions.push(currentPromptAction);
  }

  program.filter(function(action) {
      return action.actionType !== 'prompt';
    })
    .forEach(function(action) {
      if (!action.actionType && typeof(action) === 'object') {
        action.actionType = 'data';
      } else if (typeof action === 'function') {
        action = {
          actionType: 'function',
          func: action,
        };
      }
      realActions.push(action);
    });

  return realActions;
}

function _initStep(input) {
  return Q()
    .then(function() {
      if (!fs.existsSync(input.destinationDirectory)) {
        console.log('creating ', input.destinationDirectory);
        fs.mkdirSync(input.destinationDirectory);
      }
      if (!fs.exists(path.join(input.destinationDirectory, '.git'))) {
        process.chdir(input.destinationDirectory);
        return git('init');
      }
    })
    .then(function() {
      initDone = true;
      uncommittedCommands = [];
      return input;
    });
}

function _recordStep(input) {
  console.log('');
  log.debug('record step');
  log.debug('input.destinationDirectory: ', input.destinationDirectory);
  process.chdir(input.destinationDirectory);

  fs.writeFileSync(
    path.join(input.destinationDirectory, '.bedrock'),
    JSON.stringify(input)
  );
  return git('add .')
    .then(function() {
      var comment = '"bedrock #1 [' + uncommittedCommands.join(', ') + ']"';
      return git('commit -m ' + comment);
    })
    .catch(function() {
    })
    .then(function() {
      uncommittedCommands = [];
      return input;
    });
}

function executeCurrentAction(previousResult, currentAction) {
  return Q()
    .then(function() {
      uncommittedCommands.push(currentAction.actionType);
      var input = host.updateObject(
        previousResult,
        currentAction, {
          omit: ['actionType', 'executeIf'],
        }
      );
      if (initDone) {
        return _recordStep(input);
      }
      return input;
    })
    .then(function(input) {
      if (
        !currentAction.executeIf ||
        eval(ejs.render(currentAction.executeIf, input))
      ) {
        console.log('');
        log.debug('executing command ' + currentAction.actionType);
        return actionPromises[currentAction.actionType](input, host);
      }
      return input;
    });
}

function executeProgram(program, inputData) {
  inputData = inputData || {};
  var baseData = host.updateObject(
    inputData, {
      baseDir: process.cwd(),
    });

  return program.reduce(
    function(previousPromise, currentAction) {
      return previousPromise.then(function(previousResult) {
        return executeCurrentAction(previousResult, currentAction);
      });
    },
    Q(baseData)
  )
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

function compose( /* arguments */ ) {
  var composition = [];

  for (var i = 0; i < arguments.length; i++) {
    composition = composition.concat(arguments[i]);
  }
  execute(composition);
}

function registerActions(actions) {
  actions.forEach(function(actionData) {
    log.debug('registering action', actionData);
    actionPromises[actionData.name] = actionData.action;
  });
}


module.exports = {
  execute: compose,
  registerActions: registerActions,
};

var Q = require('q');
var cliPrompt = require('cli-prompt');


module.exports = {
    name: 'prompt',
    action: function(input, host) {
        return Q.Promise(function(resolve, reject, notify) {
            cliPrompt.multi(input.sequence, function(enteredData) {
                var updatedData = host.updateObject(input, enteredData);
                resolve(updatedData);
            });
        });
    }
};

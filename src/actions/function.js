var Q = require('q');


module.exports = {
    name: 'function',
    action: function(input) {
        return Q(input.func(input));
    }
};

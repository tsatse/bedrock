var Q = require('q');


module.exports = {
    name: 'data',
    action: function(input) {
        return Q(input);
    }
};

var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var fs = require('fs-extra');
var ejs = require('ejs');
var Q = require('q');


function copy(input) {
    log.debug('copying all files from ' + input.source + ' to ' + input.destination);
    fs.copySync(
        ejs.render(input.source, input),
        ejs.render(input.destination, input)
    );
    return Q(input);
}


module.exports = {
    name: 'copy',
    action: function(input) {
        return copy(input);
    }
};

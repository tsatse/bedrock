var fs = require('fs-extra');
var bunyan = require('bunyan');
var log = bunyan.createLogger({name: 'bedrock'});
var ejs = require('ejs');
var Q = require('q');


function editPackageJson(input, host) {
    var workingDir = host.getWorkingDir(input);
    log.debug('changing directory to ', workingDir);
    process.chdir(workingDir);
    var target = ejs.render(input.target, input);
    var packageJson = JSON.parse(fs.readFileSync(target));
    input.edits.forEach(function(edit) {
        switch(edit.type) {
            case 'patch':
                if(!packageJson[edit.key]) {
                    packageJson[edit.key] = {};
                }
                for(var key in edit.value) {
                    packageJson[edit.key][key] = edit.value[key];
                }
                break;
            case 'append':
                if(!packageJson[edit.key]) {
                    packageJson[edit.key] = [];
                }
                if(!(edit.value instanceof Array)) {
                    edit.value = [edit.value];
                }
                packageJson[edit.key] = packageJson[edit.key].concat(edit.value);
                break;
        }
    });
    fs.writeFileSync(target, JSON.stringify(packageJson, null, 4));
    return Q(input);
}


module.exports = {
    name: 'editPackageJson',
    action: function(input, host) {
        return editPackageJson(input, host);
    }
};

var shellCommandAction = require('../../src/actions/shell-command')[0];
var expect = require('expect.js');
var path = require('path');
var fs = require('fs');


var probeFile = path.join(__dirname, '..', 'test-sandbox', 'probe.js');

var shellCommandMissingCommandMock = {
  item2: [
    'bananas', 'apples', 'oranges'
  ]
};

var shellCommandInputMock = {
  command: 'touch ' + probeFile,
  item2: [
    'bananas', 'apples', 'oranges'
  ]
};

var hostMock = {
  getWorkingDir: function() {
    return '.';
  }
};


describe('shell command action', function() {
  describe('with a missing command', function() {
    it('should fail', function(done) {
      return shellCommandAction.action(shellCommandMissingCommandMock, hostMock)
        .then(function() {
          done(new Error('should fail'));
        })
        .catch(function() {
          done();
        });
    });
  });

  describe('with a correct input', function() {
    after(function() {
      fs.unlinkSync(probeFile);
    });

    it('should perform the command and return the same data as the input', function(done) {
      return shellCommandAction.action(shellCommandInputMock, hostMock)
        .then(function(result) {
          expect(fs.existsSync(probeFile)).to.be(true);
          expect(result).to.eql(shellCommandInputMock);
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });
  });
});
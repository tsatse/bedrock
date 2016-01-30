var copyAction = require('../../src/actions/copy')[0];
var expect = require('expect.js');
var path = require('path');
var fs = require('fs');
var rimraf = require('rimraf');


var missingSourceInput = {
  destination: path.resolve(__dirname, '..', 'test-sandbox', 'destination'),
};

var missingDestinationInput = {
  source: path.resolve(__dirname, '..', 'test-sandbox', 'source'),
};

var correctInput = {
  source: path.resolve(__dirname, '..', 'test-sandbox', 'source'),
  destination: path.resolve(__dirname, '..', 'test-sandbox', 'destination'),
};


describe('copy action', function() {
  describe('with missing source', function() {
    it('should fail', function(done) {
      return copyAction.action(missingSourceInput)
        .then(function(result) {
          done(new Error('should fail'));
        })
        .catch(function(error)  {
          done();
        });
    });
  });
});

describe('copy action', function() {
  describe('with missing destination', function() {
    it('should fail', function(done) {
      return copyAction.action(missingDestinationInput)
        .then(function(result) {
          done(new Error('should fail'));
        })
        .catch(function(error)  {
          done();
        });
    });
  });
});

describe('copy action', function() {
  describe('with correct input', function() {
    before(function() {
      fs.mkdirSync(path.join(__dirname, '..', 'test-sandbox', 'source'));
      fs.mkdirSync(path.join(__dirname, '..', 'test-sandbox', 'destination'));
      fs.writeFileSync(
        path.join(__dirname, '..', 'test-sandbox', 'source', 'source-file.js'),
        'file contents'
      );
    });

    after(function() {
      rimraf.sync(path.join(__dirname, '..', 'test-sandbox', 'source'));
      rimraf.sync(path.join(__dirname, '..', 'test-sandbox', 'destination'));
    });

    it('should behave correctly', function(done) {
      return copyAction.action(correctInput)
        .then(function(result) {
          var destinationPath = path.join(__dirname, '..', 'test-sandbox', 'destination', 'source-file.js');
          expect(fs.existsSync(destinationPath)).to.be(true);
          var fileContents = fs.readFileSync(destinationPath, 'utf8');
          expect(fileContents).to.equal('file contents');
          expect(result).to.eql(correctInput);
          done();
        })
        .catch(function(error)  {
          done(error);
        });
    });
  });
});
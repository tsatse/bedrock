var editPackageJsonAction = require('../../src/actions/edit-package-json')[0];
var expect = require('expect.js');
var path = require('path');
var fs = require('fs');


var packageJsonMock = {
  "name": "@tsatse/bedrock",
  "version": "0.1.0",
  "description": "generates project files from a template file tree and a description of all the transformations to apply on it",
  "main": "src/generate.js",
  "bin": {
    "bedrock": "src/shell-tool.js"
  },
  "scripts": {
    "test": "mocha --reporter dot --recursive test/**/*.test.js"
  },
  "keywords": ['existing-keyword'],
  "repository": "https://github.com/tsatse/bedrock",
  "author": "tsatse",
  "license": "MIT",
  "dependencies": {
    "bunyan": "^1.3.5",
    "cli-prompt": "^0.4.1",
    "ejs": "^2.3.1",
    "fs-extra": "^0.24.0",
    "git-promise": "^0.2.0",
    "nodegit": "^0.9.0",
    "npm": "^2.7.6",
    "q": "^1.2.0",
    "rimraf": "^2.3.2",
    "scp": "0.0.3",
    "wrench": "^1.5.8"
  },
  "devDependencies": {
    "expect.js": "^0.3.1",
    "mocha": "^2.2.4"
  }
};

var targetPackageJsonPath = path.join(__dirname, '..', 'test-sandbox', 'package.json');

var inputWithMissingEditsMock = {
  target: targetPackageJsonPath,
};

var inputWithMissingTargetMock = {
  edits: [],
};

var inputWithAPatchMock = {
  target: targetPackageJsonPath,
  edits: [{
    type: 'patch',
    key: 'dependencies',
    value: {
      'module': 'version'
    },
  }],
};

var inputWithAnAppendMock = {
  target: targetPackageJsonPath,
  edits: [{
    type: 'append',
    key: 'keywords',
    value: 'keyword',
  }],
};

var hostMock = {
  getWorkingDir: function() {
    return '.';
  }
};


describe('edit package.json action', function() {
  beforeEach(function() {
    fs.writeFileSync(
      targetPackageJsonPath,
      JSON.stringify(packageJsonMock)
    );
  });

  afterEach(function() {
    fs.unlinkSync(targetPackageJsonPath);
  });

  describe('with missing edits', function() {
    it('should fail', function(done) {
      editPackageJsonAction.action(inputWithMissingEditsMock, hostMock)
        .then(function() {
          done(new Error('should fail'));
        })
        .catch(function() {
          done();
        });
    });
  });

  describe('with missing target', function() {
    it('should fail', function(done) {
      editPackageJsonAction.action(inputWithMissingTargetMock, hostMock)
        .then(function() {
          done(new Error('should fail'));
        })
        .catch(function() {
          done();
        });
    });
  });

  it('should perform a patch correctly', function(done) {
    return editPackageJsonAction.action(inputWithAPatchMock, hostMock)
      .then(function(result) {
        var resultFileContents = fs.readFileSync(targetPackageJsonPath, 'utf8');
        expect(JSON.parse(resultFileContents).dependencies.module).to.equal('version');
        expect(result).to.eql(inputWithAPatchMock);
        done();
      })
      .catch(function(error) {
        done(error);
      });
  });

  it('should perform an append correctly', function(done) {
    return editPackageJsonAction.action(inputWithAnAppendMock, hostMock)
      .then(function(result) {
        var resultFileContents = fs.readFileSync(targetPackageJsonPath, 'utf8');
        expect(JSON.parse(resultFileContents).keywords).to.eql(['existing-keyword', 'keyword']);
        expect(result).to.eql(inputWithAnAppendMock);
        done();
      })
      .catch(function(error) {
        done(error);
      });
  });
});
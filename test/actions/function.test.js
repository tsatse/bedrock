var functionAction = require('../../src/actions/function')[0];
var expect = require('expect.js');


var dataMock = {
  item1: 1,
  func: function(data) {
    return dataMock2;
  },
  item2: [
    'bananas', 'apples', 'oranges'
  ],
};

var dataMock2 = {
  item1: 1,
  func: function(data) {
    return dataMock2;
  },
  item2: [
    'bananas', 'apples', 'oranges'
  ],
  item3: 3,
};

describe('function action', function() {
  it('should return the same data as the input', function() {
    return functionAction.action(dataMock)
      .then(function(result) {
        expect(result).to.eql(dataMock2);
      });
  });
});
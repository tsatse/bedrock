var dataAction = require('../../src/actions/data')[0];
var expect = require('expect.js');


var dataMock = {
  item1: 1,
  item2: [
    'bananas', 'apples', 'oranges'
  ]
};


describe('data action', function() {
  it('should return the same data as the input', function() {
    return dataAction.action(dataMock)
      .then(function(result) {
        expect(result).to.eql(dataMock);
      });
  });
});
var data = require('../src/actions/data');
var expect = require('expect.js');


var dataMock = {
    item1: 1,
    item2: [
        'bananas', 'apples', 'oranges'
    ]    
};


describe('data', function() {
    it('should return the same data as the input', function() {
        return data.action(dataMock)
            .then(function(result) {
                expect(result).to.eql(dataMock);
            });
    });
});

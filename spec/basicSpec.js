'use strict';

/* eslint-env node, jasmine */

const sstruct = require('../lib/sstruct')
const fs = require('fs')

describe('A suite', function() {
  it('contains spec with an expectation', function() {
    var basic = fs.createReadStream('./samples/basic.ss', { encoding: 'utf-8' })
    var expectedValues = JSON.parse(fs.readFileSync('./samples/basic.json', 'utf8'));
    var expectedMeta = JSON.parse(fs.readFileSync('./samples/basic.meta.json', 'utf8'));
    var meta = {}
    sstruct.parseStream(basic, { meta: meta })
      .then(function (result) {
        basic.close()
        expect(result).toEqual(expectedValues)
        expect(meta).toEqual(expectedMeta)
      })
  });
});

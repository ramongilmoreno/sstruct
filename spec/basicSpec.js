'use strict';

/* eslint-env node, jasmine */

const sstruct = require('../lib/sstruct')
const fs = require('fs')
const pino = require('pino')

const logger = pino({ level: process.env['SSTRUCT_BASICSPEC_LOG_LEVEL'] || 'info' })

var aux = function (filename) {
    var basename = filename.replace(/\.ss$/, '')
    logger.info('Testing filename %s[.ss/.data.json/.meta.json]', basename)
    var expectedData = JSON.parse(fs.readFileSync(basename + '.data.json', 'utf8'))
    var expectedMeta = JSON.parse(fs.readFileSync(basename + '.meta.json', 'utf8'))
    var meta = {}
    sstruct.parseFile(filename, { meta: meta })
      .then(function (result) {
        expect(result).toEqual(expectedData)
        expect(meta).toEqual(expectedMeta)
      })
}

describe('Simple Struct[ure] parser', function() {

  it('loads basic sample', function() {
    aux('./samples/basic.ss')
  })

  it('loads meta data', function() {
    aux('./samples/README.meta.ss')
  })
})

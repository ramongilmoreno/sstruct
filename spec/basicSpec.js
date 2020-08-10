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

  it('knows how to parse files and strings', function() {
    var path = './samples/basic.ss'
    return Promise.all([
      Promise.resolve()
        .then(() => {
          var input = fs.createReadStream(path, { encoding: 'utf-8' })
          return sstruct.parseStream(input)
            .finally(() => { input.close() })
        }),
      fs.promises.readFile(path, { encoding: 'utf8' })
        .then(contents => sstruct.parseString(contents)),
      sstruct.parseFile(path)
    ])
      .then(arr => {
        expect(arr[0]).toEqual(arr[1])
        expect(arr[1]).toEqual(arr[2])
        expect(arr[0]).toEqual(arr[2])
      })
  })
})

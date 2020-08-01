#!/usr/bin/env node

'use strict';

const fs = require('fs')
const sstruct = require('./sstruct')

// https://x-team.com/blog/a-guide-to-creating-a-nodejs-command/
const [,, ... args] = process.argv

var input = fs.createReadStream(args[0], { encoding: 'utf-8' })
sstruct.parseStream(input)
  .finally(() => { input.close() })
  .then(result => {
    console.log(JSON.stringify(result, null, '    '))
    process.exit(0)
  })
  .catch(error => {
    console.err(error)
    process.exit(-1)
  })
  


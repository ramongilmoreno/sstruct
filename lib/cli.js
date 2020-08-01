#!/usr/bin/env node

'use strict';

const fs = require('fs')
const sstruct = require('./sstruct')

// https://x-team.com/blog/a-guide-to-creating-a-nodejs-command/
const [,, ... args] = process.argv

var help = `
    Parses a Simple Struct[ured] input writes the result to the output stream

    Usage: sscript <action> [filename]

    Where <action> is one of:

      data - Parse input and write result to the output stream

      meta - Parse input and write metadata to the output stream

    The optional [filename] parameter tells which file to parse. If no file is
    given, input will be the input stream.
`
function printHelp (msg, out, code) {
  out(msg)
  out(help)
  process.exit(code)
}
function print (obj) {
  console.log(JSON.stringify(obj, null, '    '))
  process.exit(0)
}
if (args.length < 1) {
  printHelp('No action provided in the command line. Help shown below:', console.error, -1)
}

// Prepare action
var data = undefined
var meta = {}
var printer = undefined
switch (args[0]) {
  case 'help':
    printHelp('sstruct command help', console.log, 0)
    break
  case 'data':
    printer = () => { print(data) }
    break
  case 'meta':
    printer = () => { print(meta) }
    break
  default:
    printHelp('Unknown action [' + args[0] + ']', console.error, -1)
    break
}

// Create input file
var input = undefined
if (args.length > 1) {
  input = fs.createReadStream(args[1], { encoding: 'utf-8' })
} else {
  input = process.stdin
}

sstruct.parseStream(input, { meta: meta })
  .finally(() => { if (input != process.stdin) { input.close() } })
  .then(result => {
    data = result
    printer()
  })
  .catch(error => {
    console.error(error)
    process.exit(-1)
  })
  


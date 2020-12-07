'use strict';

const readline = require('readline')
const fs = require('fs')
const pino = require('pino')
const { Readable } = require("stream")

// SSTRUCT_LOG_LEVEL environment variable allows setting the desired log level
// see https://getpino.io/#/docs/api?id=level-string details for valid values
// For "production" NODE_ENV value
const logger = pino({ level: process.env['SSTRUCT_LOG_LEVEL'] || (process.env.NODE_ENV == 'production' ? 'info' : 'info') })
const statusBeforeSeparator = { name: 'Before separator' }
const statusAfterSeparator = { name: 'After separator' }

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Parses the input stream; options object can be provided to tune parsing
// procedure, e.g. obtain meta info in another object.
//
// The function returns a Promise that is resolved to the parsed object.
module.exports.parseStream = function (input, options) {
  return new Promise(function (resolve, reject) {
    options = options || {}
    var meta = options.meta === undefined ? {} : options.meta
    var trimMeta = options.metaRemoveLeadingAndTrailingEmptyLines != undefined ? options.metaRemoveLeadingAndTrailingEmptyLines : true
    var trimValue = options.valueRemoveLeadingAndTrailingEmptyLines != undefined ? options.valueRemoveLeadingAndTrailingEmptyLines : true
    var acc = {}
    
    var status = statusBeforeSeparator
    const matchComment = /^\s*#(.*)$/
    const matchSeparator = /^([^\s]+)\s*(.*?)\s*$/
    const matchEmpty = /^[\s]*$/

    var rl = readline.createInterface({ input: input })
   
    // Init current status
    var current = {} 
    function data (values, action) {
      function clean (arr) {
        var found = false
        return arr.filter(x => { found = found || !x.match(/^\s*$/); return found; })
      }
      var v = values
      if (action) {
         v = clean(clean(v).reverse()).reverse()
      }
      return v.join('\n')
    }
    function closeField (init) {
      if (!init) {
        acc[current.name] = data(current.data, trimValue)
        meta[current.name] = data(current.meta, trimMeta)
      }
      current.name = undefined
      current.matchEnd = undefined
      current.matchNextField = undefined
      current.data = []
      current.meta = []
    }
    closeField(true)

    // Proceed to read lines
    rl.on('line', function (line, lineCount /*, byteCount */) {
      const l = logger.child({ status: status, lineNumber: lineCount })
      l.debug({ line: line })
      var m
      switch (status) {
        case statusBeforeSeparator:
          // If a comment is found, attach to meta
          m = line.match(matchComment)
          if (m) {
            // Add to meta and continue
            l.debug('Adding meta [%s]', m[1])
            current.meta.push(m[1])
            break
          }
           
          // Check a new separator gets 
          m = line.match(matchSeparator)
          if (m) {
            // Move to status after separator
            l.debug({ separator: m[1], field: m[2], newStatus: statusAfterSeparator })
            current.name = m[2]
            current.matchEnd = new RegExp('^(' + escapeRegExp(m[1]) + ')\\s*$')
            current.matchNextField = new RegExp('^(' + escapeRegExp(m[1]) + ')\\s+(.*?)\\s*$')
            status = statusAfterSeparator
            break
          }

          // Discard empty lines
          m = line.match(matchEmpty)
          if (m) {
            // Silently skip it
            l.debug("Skipping empty line %d", lineCount)
            break
          }

          // We have reach the point where we don't know what to do with the line
          l.info('Unexpected line %d: [%s]', lineCount, line)
          break

        case statusAfterSeparator:
          // If lines matches the end of the field, close the field and move to
          // beforeSeparator status
          if (line.match(current.matchEnd)) {
            l.debug('Close field (no open new one) %o', { closingField: current.name, newStatus: statusBeforeSeparator })
            closeField()
            status = statusBeforeSeparator
            break
          }
          
          // Check if line matches next field with the same separator
          m = line.match(current.matchNextField)
          if (m) {
            // New field
            l.debug('Close field (and open new one) %o', { closingField: current.name, separator: m[1], field: m[2], newStatus: statusAfterSeparator })
            closeField()
            current.name = m[2]
            current.matchEnd = new RegExp('^(' + escapeRegExp(m[1]) + ')\\s*$')
            current.matchNextField = new RegExp('^(' + escapeRegExp(m[1]) + ')\\s+(.*?)\\s*$')
            status = statusAfterSeparator
            break
          }
          
          // Appending data without trimming and keep current status
          l.debug({ field: current.name, appendingLine: current.data, line: line })
          current.data.push(line)
          break

        default:
          l.error('Unknown status %o', status)
          break
      }
      
    })
    .on('close', function() {
      logger.debug({ statusAtClose: status })
      if (status == statusAfterSeparator) {
        closeField()
      }
      resolve(acc)
    })
    .on('error', function (e) { reject(e) })
  })
}

// Same as parseStream, but this function receives the input file name.
module.exports.parseFile = function (filename, options) {
  var input = fs.createReadStream(filename, { encoding: 'utf-8' })
  return module.exports.parseStream(input, options)
    .finally(() => { input.close() })
}

// Same as parseStream, but for an string input
module.exports.parseString = function (input, options) {
  var stream = Readable.from(input)
  return module.exports.parseStream(stream, options)
}


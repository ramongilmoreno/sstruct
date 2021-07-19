# Simple Struct[ured] format (sstruct/ss)

Definition and Javascript parser implementation of a simple structured file
format.

This format is used to produce files which represent a set of key=value pairs,
where values can be written in a human-readable multiline format (multiline
keys are not supported).

## Design goals

The definition of the format is intended to produce human readable (and
writable) definition of maps/dictionaries/structures.

No need to escape special characters: instead an appropriate separator may be
used for a field; such as that separator does not occur at the beginning of any
line in the field value.

Multiline values can be written verbatim in the file.

## Comparison with JSON

The JSON format is far more flexible: properties may be string, but also
numbers, boolean values, undefined or even inner objects. The simple structured
format only allows string values.

But the JSON footprint is bigger than the one defined by the simple structured
format: in the latter there is no need for additional quotes, colons or commas.
Instead a field line definition, with barely the separator and field name,
just leads to the start of the field value in the next lines.

Also, the multiline capability for the values is simpler and more
human-readable/editable than a multiline text in a JSON object. This is a key
design goal for the simple structured format.

## Example of a Simple Struct[ured] file

This is a sample file with three fields (`.ss` extension is suggested):

    _ 1
    One
    _ 2
    T
     W
      O
    _
    ttt Number three
    333
       3
    333
       3
    333
    ttt

Which is equivalent to this JSON:

    {
        "1": "One",
        "2": "T \n W\n  O",
        "Number three": "333\n   3\n333\n   3\n333"
    }

## Features

### Small footprint

The amount of data for separations between fields small: a line like this
starts a new field:

    <separator> <field name>

The `<separator>` word does not contain any spaces, but `<field name>` may.

There may be indentation before `<separator>` and trailing spaces after the
`<field name>`; and even multiple spaces between the `<separator>` and the
beginning of the `<field name>`. All these spaces will be trimmed during
processing.

The `<separator>` must not occur at the beginning of any line of the field
value. The field value includes all lines from the field declaration line until
a new field declaration of a field end line. A field end line is simply a line
with the `<separator>` value.

    <separator>

Note that a field closing line is not mandatory: a field close line with a new
field name will close previous field and start a new one, with the same
separator. The end of file (EOF) also closes the last field in the file.

### Multiple separator words

Since the string `<separator>` of field cannot happen at the beginning of the
field contents, this string must be chosen in a way the field contents do not
close the field incorrectly.

Once a field separator has been selected, this selection does not impose a
separator for other fields, as new fields might use their own separator.

Here is an example of this multiplicity:

    _ 1
    One
    _ 2
    Two
    _
    x 3
    _ The leading "_" is not a field separator, but part of value of field 3

Which leads to this JSON output:

    {
        "1": "One",
        "2": "Two",
        "3": "_ The leading \"_\" is not a field separator, but part of value of field 3"
    }

Note that "1" and "3" fields were closed implicitly: "1" was closed by the the
opening of field "2" with the same separator, and "3" was closed by the EOF.

### Meta data values

Meta data are lines starting with the comment/hash `#` symbol *before the field
name definition line*.

The rest of the line after the `#` symbol is appended to the meta data, and
will be associated with a field name when the field is defined. No trimming of
the line is carried out.

For example, these contents will result in the following result and meta data:

Input:

    #Metadata of field 1
     #More metadata of field 1
     # Even more metadata of field 1
    _ field 1
    Value of field 1
    _ field 2 without metadata
    Value of field 2
    _
    #Metadata of field 3
    _ field 3
    Value of field 3
    _
    # Metadata of no field, as EOF is reached. Will be discarded

Meta data:

    {
        "field 1": "Metadata of field 1\nMore metadata of field 1\n Even more metadata of field 1",
        "field 2 without metadata": "",
        "field 3": "Metadata of field 3"
    }

Result:

    {
        "field 1": "Value of field 1",
        "field 2 without metadata": "Value of field 2",
        "field 3": "Value of field 3"
    }

### Sensible trimming and removal of empty lines

Field names are trimmed in the field defintion lines.

Empty lines in meta data and field values are removed by default, but this is
an option of the parser. When these options are enabled (as per default), the
leading and trailing empty (only spaces) lines of the meta or value data are
removed.

## Format technical data

### Input data is read as UTF-8

A simple structured format parser will try to read an stream of bytes as UTF-8
characters. Non compliant UTF-8 bytes sequences will result in a failure to
parse the file.

### New lines are always '\n'

The multiline values (either actual field values or meta data) read from a
simple structured formatted file will only contain the '\n' line separator
(0x0A byte).

For input data, these will be considered line breaks:

* '\r' then immediately '\n' (Windows standard)
* '\r' (Classic Mac OS)
* '\n' (Unix style)

### Suggested .ss filename extension

The `.ss` filename extension (for _**S**imple **S**truct_, lowercase) is
recommended.

## Javascript implementation

Install the `sstruct` package:

    $ npm install --save sstruct

To parse a file create an input stream, with UTF-8 encoding, and call the
`parseStream` method.

    const fs = require('fs')
    const sstruct = require('sstruct')

    var input = fs.createReadStream(ssfilename, { encoding: 'utf-8' })
    sstruct.parseStream(input)
      .finally(() => { input.close() })
      .then(result => {
        console.log(JSON.stringify(result, null, '    '))
      })
      .catch(error => {
        console.err(error)
      })
 
### API

#### `parseStream(stream, [options])`

Parses the given input stream and returns a `Promise` which will be resolved to
the parsed object.

The `options` object can provided to customize parsing with the following
properties:

* `meta`, if provided, meta data will be saved in this object. Properties names
  will be the field names; and the meta data values will be the contents of the
  meta data comments from the input.

* `metaRemoveLeadingAndTrailingEmptyLines`, set to `true` (default value) to
  remove leading and trailing empty lines from meta data.

* `valueRemoveLeadingAndTrailingEmptyLines`, set to `true` (default value) to
  remove leading and trailing empty lines from value data.

#### `parseFile(filename, [options])`

Parses the file at `filename`. Creates a stream from the file contents with
UTF-8 encoding and calls `parseStream`.

See `parseStream` for the details of the `options` parameter.

#### `parseString(input, [options])`

Parses the string given as `input` creating a stream from it and calling
`parseStream`.

See `parseStream` for the details of the `options` parameter.

### Command line interface (CLI)

When installed, the `sstruct` command will parse an input `.ss` file given as
paremeter (or read from the standard input).

    $ npm install -g sstruct

    ...

    $ sstruct help
    sstruct command help.

    Parses a Simple Struct[ured] input and writes the result as JSON to the output
    stream.

    Usage:

        sscript <action> [filename]

    Where <action> is one of:

        data - Parse input and write result to the output stream

        meta - Parse input and write metadata to the output stream

    The optional [filename] parameter tells which file to parse. If no file is
    given, input will be the input stream. 
    $ sstruct data ./samples/README.ss
    {
        "1": "One",
        "2": "T \n W\n  O",
        "Number three": "333\n   3\n333\n   3\n333"
    }
    $

Use the `npx` command to run the `sstruct` command if installed locally:

    $ npm install sstruct

    ...

    $ npx sstruct help

    ...


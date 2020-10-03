#!/usr/bin/env node

const meow = require("meow");
const exec = require("./exec");

const cli = meow(
  `
    Outline

        Replace string pattern values for specific files or files with specific extensions.

    Usage

        $ line-replacer <"file" or "directory"> --args

    Required arguments

        <"dir" mode, required args>
            --dir, -d                specify target directory
            --ext, -e                specify target file's extension

        <"file" mode , required args>
            --target, -t             specify target file

        <optional argument>
            --dst, -dst              specify the name of the output file. 
                                     default value is '__replace__.{originalFileName}'.

            --verbose, -v            print all information about the text replaced in console.
                                     default is 'false'
            
            --debug                  outputs debugging information to the 'DEBUG_INFO' file

            --once, -o               even if there are multiple substitution values in a line, they are replaced only once.

            --replaceList, -r        specify replace properties file, 
                                     default value is './rlist'
                                     name './rlist_{fileName}' if you want to apply different rlist files per file

            --startLinePatt, -slp    apply replace from that line.
            --endLinePatt, -elp      specify end line pattern.

            --conf, -c               check the string values that you want to replace on each line.

            --reg, -g                specify regular expression with the rlist file.
                                     see README.md for more detail usage.

            --sep, -s                specify rlist's spliter. 
                                     default value is '='

    Examples

        $ line-replacer file --target=./abc.java --replaceList=./rlist
        $ line-replacer dir --dir=./ ext=java --replaceList=./rlist


    See README.md for more details.
`,
  {
    flags: {
      dir: {
        type: "string",
        alias: "d",
        isRequired: (flags, input) => {
          if (input === "dir") return true;
          else return false;
        },
      },
      ext: {
        type: "string",
        alias: "e",
        isRequired: (flags, input) => {
          if (input === "dir") return true;
          else return false;
        },
      },
      target: {
        type: "string",
        alias: "t",
        isRequired: (flags, input) => {
          if (input === "file") return true;
          else return false;
        },
      },
      replaceList: {
        type: "string",
        alias: "l",
        isRequired: (flags, input) => false
      },
      verbose: {
        type: "boolean",
        alias: "v",
        isRequired: (flags, input) => false
      },
      once: {
        type: "boolean",
        alias: "o",
        isRequired: (flags, input) => false
      },
      startLinePatt: {
        type: "string",
        alias: "slp",
        isRequired: (flags, input) => false
      },
      endLinePatt: {
        type: "string",
        alias: "elp",
        isRequired: (flags, input) => false
      },
      dst: {
        type: "string",
        alias: "ds",
        isRequired: (flags, input) => false
      },
      conf: {
        type: "boolean",
        alias: "c",
        isRequired: (flags, input) => false
      },
      reg: {
        type: "string",
        alias: "r",
        isRequired: (flags, input) => false
      },
      debug: {
        type: "boolean",
        isRequired: (flags, input) => false
      },
      sep: {
        type: "string",
        isRequired: (flags, input) => false,
        alias: "s",
        default: "=",
      }
    },
  }
);

exec(cli.input[0], cli.flags);
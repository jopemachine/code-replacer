const chalk = require('chalk')

module.exports = {
  TEMPLATE_SPLITER: '->',
  cliSelectorString: {
    FILE_DIR: chalk.yellow('Choose from file tree'),
    TYPE_INPUT: chalk.yellow('Type input'),
    ENTER_TEMPLATE: chalk.yellow('Enter template'),
    ENTER_EXCLUDE_KEY: chalk.yellow('Enter excludeKey')
  },
  CLI_SELCTOR_MAX_DISPLAYING_LOG: 5,
  HELP_STRING:
  `
    Outline

        Replace string pattern values for specific files or files with specific extensions.

    Usage

        $ code-replacer <...args>

    Required arguments

        <required args>

            --dir, -d                     specify target directory
            --ext, -e                     specify target file's extension.
                                          (Use this with dir to target multiple files)

            --src, -s                     specify target file. 
                                          when target and dir are given, 
                                          target the files corresponding to the name in the target directory.
                                          (no need to ext)

            --csv, -c                     specify replace properties file, 
                                          default value is './rlist'
                                          name './rlist_{fileName}',
                                          if you want to apply different rlist files per file

        <optional argument>

            --dst, -dst                   specify the name of the output file. 
                                          default value is '__replace__.{originalFileName}'.

            --verbose, -v                 print all information about the text replaced in console.
                                          default is 'false'

            --debug                       outputs debugging information to the 'DEBUG_INFO' file

            --once, -o                    even if there are multiple substitution values in a line,
                                          they are replaced only once.

            --startLinePatt, -slp         apply replace from that line.

            --endLinePatt, -elp           specify end line pattern.

            --conf, -c                    check the string values that you want to replace on each line.

            --template, -tem              specify template string.
                                          see README.md for more detail usage.

            --overwrite, -o               overwrite existing file.

            --excludeReg, -x              specify the regular expression of the line
                                          to be excluded from the replace.

            --no-escape, -n               apply the left side of the template as a regular expression,
                                          therefore, special character literals should be escaped with this option.

    Examples

        $ code-replacer --target=./abc.java --replaceList=./rlist
        $ code-replacer --dir=./ ext=java --replaceList=./rlist


    See README.md for more details.
`
}
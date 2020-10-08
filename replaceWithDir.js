const path = require('path')
const replaceWithFile = require('./replaceWithFile')
const recursive = require('recursive-readdir')
const chalk = require('chalk')

module.exports = async function (props) {
  recursive(path.resolve(props.dir), [], async (_err, files) => {
    const targetFiles = files.map((filePath) => {
      const targetFileName = filePath.split(path.sep).reverse()[0]
      if (props.src && targetFileName === props.src) {
        return filePath
      } else if (
        !props.src &&
        targetFileName.split('.')[1] === props.ext &&
        !targetFileName.startsWith('__replacer__.')
      ) { return filePath }
    })

    // TODO: sort not works
    targetFiles.sort((a, b) => a.localeCompare(b))

    for (const targetFile of targetFiles) {
      if (!targetFile) continue
      props.src = targetFile
      await replaceWithFile(props)
      console.log(chalk.gray('##########################################################################################\n'))
    }
  })
}

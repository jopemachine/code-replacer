const path = require('path')
const parseSourceFile = require('../../../src/sourceFileParser').default
const { readCsv } = require('../../../src/util').default
const ReplacerTest = require('../../util')

describe('Example 3, basic csv column key test', () => {
  test('Example 3 replacer test with multi basic csv column key', async () => {
    const args = {
      csvTbl: await readCsv(`${__dirname}${path.sep}rlist.csv`),
      srcFileLines: (parseSourceFile({ srcFile: `${__dirname}${path.sep}index.js` })).srcFileLines,
      templateLValue: '${source}${index}',
      templateRValue: '<div id="${id}" class="${class}" />'
    }

    const testPassedOrErrorLine = new ReplacerTest({
      replaceArgs: args,
      expectedResult:
`<div id="id_1" class="class1" />
<div id="id_2" class="class2" />
<div id="id_3" class="class3" />`
    }).test()

    expect(testPassedOrErrorLine).toBe(true)
  })
})

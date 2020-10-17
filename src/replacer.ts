import chalk from 'chalk'
import matchAll from './matchAll'
import yn from 'yn'
import readlineSync from 'readline-sync'
import debuggingInfoArr from './debuggingInfo'
import optionManager from './optionManager'
import {
  handleTemplateLValuesLRefKey,
  handleTemplateLValuesSpecialCharEscape,
} from "./template"
import {
  CreatingReplacingObjError,
  InvalidLeftTemplateError,
  InvalidRightReferenceError,
  ERROR_CONSTANT,
} from "./error"

import utils from './util'
import { MatchingPoints } from './type/matchingPoints'

const displayConsoleMsg = ({
  lineIdx,
  matchingInfo,
  replaceObj,
  resultLines,
  srcFileLines,
  srcFileName,
  srcLine
}) => {
  const matchingStr = matchingInfo[0]

  const sourceStr = utils.createHighlightedLine(
    srcLine,
    matchingInfo.index,
    matchingStr,
    matchingInfo.index + matchingStr.length
  )
  const replacedStr = utils.createHighlightedLine(
    srcLine,
    matchingInfo.index,
    replaceObj[matchingStr],
    matchingInfo.index + matchingStr.length
  )

  utils.funcExecByFlag(
    optionManager.getInstance().confOpt ||
      optionManager.getInstance().verboseOpt,
    () =>
    utils.printLines(
        srcFileName,
        lineIdx,
        sourceStr,
        replacedStr,
        srcFileLines,
        resultLines
      )
  )

  utils.logByFlag(
    optionManager.getInstance().confOpt,
    chalk.dim(
      chalk.italic(
        "## Press enter to replace the string or 'n' to skip this word or 's' to skip this file."
      )
    )
  )
}

const applyCSVTable = ({
  csvTbl,
  templateLValue,
  templateRValue,
}: {
  csvTbl: any;
  templateLValue: string;
  templateRValue: string;
}) => {
  const replaceObj = {};
  templateRValue = templateRValue.trim().normalize();

  if (csvTbl.length > 0 && templateLValue) {
    const columnNames = Object.keys(csvTbl[0]);
    for (const csvRecord of csvTbl) {
      let key = templateLValue;
      let value = templateRValue;

      for (const columnName of columnNames) {
        const trimmedColumnName = columnName.trim();

        // TODO: make me handleCSVColKey
        key = utils.replaceAll(
          key,
          `\${${trimmedColumnName}}`,
          csvRecord[columnName]
        );

        value = utils.replaceAll(
          value,
          `\${${trimmedColumnName}}`,
          csvRecord[columnName]
        );
      }

      if (replaceObj[key]) {
        throw new CreatingReplacingObjError(
          ERROR_CONSTANT.DUPLICATE_KEY(key, replaceObj[key])
        );
      }
      replaceObj[key] = value;
    }
  }

  if (csvTbl.length < 1) {
    // assume to replace using group regular expressions only
    replaceObj[templateLValue] = templateRValue;
  }

  return replaceObj;
};

const getMatchingPoints = ({
  srcLine,
  replacingKeys,
}: {
  srcLine: string;
  replacingKeys: string[];
}) => {
  let matchingPoints: MatchingPoints = [];
  let matchingPtCnt = 0;

  for (const replacingKey of replacingKeys) {
    // reg of replacingKey is already processed
    const { escaped, str: escapedKey } = handleTemplateLValuesSpecialCharEscape(
      replacingKey
    );
    const regKey = handleTemplateLValuesLRefKey({
      escaped,
      templateLValue: escapedKey,
    });
    const replacingKeyReg = new RegExp(regKey);
    const replacingKeyMatchingPts = matchAll(srcLine, replacingKeyReg);

    for (const replacingKeyMatchingPt of replacingKeyMatchingPts) {
      let existingMatchingPtIdx = -1;

      for (
        let matchingPtIdx = 0;
        matchingPtIdx < matchingPoints.length;
        matchingPtIdx++
      ) {
        const cands = matchingPoints[matchingPtIdx];
        const replacingKeyMatchingStr = replacingKeyMatchingPt[0];
        const longestStrInMatchingPt = cands[0][0];

        if (
          replacingKeyMatchingStr === longestStrInMatchingPt ||
          !longestStrInMatchingPt.includes(replacingKeyMatchingStr)
        ) {
          continue;
        }

        // Should be same matching point.
        if (
          longestStrInMatchingPt.length >
          replacingKeyMatchingPt.index - cands[0].index
        ) {
          existingMatchingPtIdx = matchingPtIdx;
          break;
        }
      }

      matchingPoints.replacingKey = replacingKey;
      if (existingMatchingPtIdx === -1) {
        matchingPoints[matchingPtCnt++] = [replacingKeyMatchingPt];
      } else {
        matchingPoints[existingMatchingPtIdx].push(replacingKeyMatchingPt);
      }
    }
  }

  for (
    let matchingPtIdx = 0;
    matchingPtIdx < matchingPoints.length;
    matchingPtIdx++
  ) {
    const cands = matchingPoints[matchingPtIdx];
    cands.leastIdx = Number.MAX_SAFE_INTEGER;

    for (let candIdx = 0; candIdx < cands.length; candIdx++) {
      if (cands.leastIdx > cands[candIdx].index) {
        cands.leastIdx = cands[candIdx].index;
      }
    }
  }

  // Sort matching points to match in asc order
  matchingPoints.sort((lPt, rPt) => {
    return lPt.leastIdx - rPt.leastIdx;
  });

  return {
    matchingPoints,
    matchingPtCnt,
  };
};

const getReplacedString = ({
  replaceObj,
  matchingStr,
}: {
  replaceObj: any;
  matchingStr: string;
}) => {
  const noEscapeOpt = optionManager.getInstance()["no-escape"];

  // exactly match :: use regexp and insert new item
  // not exactly match, but match in regexp :: use regexp and dont insert one
  if (noEscapeOpt && !replaceObj[matchingStr]) {
    for (const key of Object.keys(replaceObj)) {
      if (new RegExp(key).test(matchingStr)) {
        return replaceObj[key];
      }
    }
  }

  return replaceObj[matchingStr];
};

const replace = ({
  srcFileName,
  srcFileLines,
  csvTbl,
  templateLValue,
  templateRValue,
  excludeRegValue,
  startLinePatt,
  endLinePatt
}) => {
  const resultLines = []
  const replaceObj = applyCSVTable({
    csvTbl,
    templateLValue,
    templateRValue
  })

  if (templateLValue === '') { throw new InvalidLeftTemplateError(ERROR_CONSTANT.LEFT_TEMPLATE_EMPTY) }
  const replacingKeys = Object.keys(replaceObj)

  // sort by length -> prioritize and map keys with long values first.
  replacingKeys.sort(function (a, b) {
    return b.length - a.length || b.localeCompare(a)
  })

  let lineIdx = 1
  let blockingReplaceFlag = !!startLinePatt

  for (let srcLine of srcFileLines) {
    if (excludeRegValue && srcLine.match(new RegExp(excludeRegValue))) {
      lineIdx++
      resultLines.push(srcLine)
      continue
    }

    // handle blocking replace
    utils.funcExecByFlag(
      blockingReplaceFlag &&
        startLinePatt &&
        srcLine.trim() === startLinePatt.trim(),
      () => {
        utils.funcExecByFlag(optionManager.getInstance().debugOpt, () =>
          debuggingInfoArr.getInstance().append(
            `Encountered startLinePatt on line ${lineIdx}`
          )
        )
        blockingReplaceFlag = false
      }
    )

    utils.funcExecByFlag(
      !blockingReplaceFlag &&
        endLinePatt &&
        srcLine.trim() === endLinePatt.trim(),
      () => {
        utils.funcExecByFlag(optionManager.getInstance().debugOpt, () =>
          debuggingInfoArr.getInstance().append(`Encountered endLinePatt on line ${lineIdx}`)
        )
        blockingReplaceFlag = true
      }
    )

    if (!blockingReplaceFlag) {
      const { matchingPoints, matchingPtCnt } = getMatchingPoints({
        srcLine,
        replacingKeys
      })

      for (
        let matchingPtIdx = 0;
        matchingPtIdx < matchingPtCnt;
        matchingPtIdx++
      ) {
        // Match the longest string first
        const matchingCandidates = matchingPoints[matchingPtIdx]

        for (
          let candidateIdx = 0;
          candidateIdx < matchingCandidates.length;
          candidateIdx++
        ) {
          const matchingInfo = matchingCandidates[candidateIdx]
          let matchingStr = matchingInfo[0]

          // TODO: Remove this if statement
          if (templateLValue && templateRValue) {
            // handle grouping value
            const findLRefKey = new RegExp(/\$\[(?<lRefKey>[\d\w]*)\]/)
            const lRefKeys = matchAll(templateRValue, findLRefKey)
            const rvalue = replaceObj[matchingPoints.replacingKey]

            for (const lRefKeyInfo of lRefKeys) {
              const lRefKey = lRefKeyInfo[1]
              for (let regKey of Object.keys(replaceObj)) {
                const { escaped, str: escapedKey } = handleTemplateLValuesSpecialCharEscape(regKey)
                regKey = handleTemplateLValuesLRefKey({ escaped, templateLValue: escapedKey })

                const replacedHandleRValue = rvalue
                const findMatchingStringReg = new RegExp(regKey)
                const groupKeyMatching = srcLine.match(findMatchingStringReg)
                if (!groupKeyMatching) continue
                const groupKeyMatchingStr = groupKeyMatching.groups[lRefKey]

                if (!groupKeyMatchingStr) {
                  throw new InvalidRightReferenceError(ERROR_CONSTANT.NON_EXISTENT_GROUPKEY)
                }

                // 1. handle replacingKey's $[key] (transformed into group key)
                matchingStr = utils.replaceAll(
                  matchingStr,
                  `(?<${lRefKey}>)`,
                  groupKeyMatchingStr
                )

                // 2. handle replacingObject's $[key]

                // TODO: make me handleTemplateRValuesLRefKey
                replaceObj[matchingStr] = utils.replaceAll(
                  replaceObj[matchingStr] ? replaceObj[matchingStr] : replacedHandleRValue,
                  `$[${lRefKey}]`,
                  groupKeyMatching.groups[lRefKey]
                )

                break
              }
            }
          }

          displayConsoleMsg({
            srcLine,
            matchingInfo,
            replaceObj,
            srcFileName,
            lineIdx,
            srcFileLines,
            resultLines
          })

          let input = 'y'
          optionManager.getInstance().confOpt && (input = readlineSync.prompt())

          if (yn(input) === false) {
            // skip this word. choose other candidate if you have a shorter string to replace.
            utils.logByFlag(
              optionManager.getInstance().confOpt ||
                optionManager.getInstance().verboseOpt,
              chalk.red('\nskip..')
            )
          } else if (input.startsWith('s')) {
            // skip this file.
            console.log(chalk.red(`\nskip '${srcFileName}'..`))
            return -1
          } else {
            // replace string
            const replacedString = getReplacedString({ replaceObj, matchingStr })

            // push the index value of the other matching points.
            for (
              let otherPtsCandidateIdx = matchingPtIdx + 1;
              otherPtsCandidateIdx < matchingPtCnt;
              otherPtsCandidateIdx++
            ) {
              const otherPts = matchingPoints[otherPtsCandidateIdx]

              for (const candItem of otherPts) {
                candItem.index += replacedString.length - matchingStr.length
              }
            }

            utils.logByFlag(
              optionManager.getInstance().confOpt ||
                optionManager.getInstance().verboseOpt,
              chalk.yellow('\nreplace..')
            )

            srcLine =
              srcLine.substr(0, matchingInfo.index) +
              replacedString +
              srcLine.substr(
                matchingInfo.index + matchingStr.length,
                srcLine.length
              )
            break
          }
        }

        if (optionManager.getInstance().onceOpt) break
      }

      lineIdx++
      resultLines.push(srcLine)
    }
  }

  return resultLines
}

export {
  replace,
  applyCSVTable,
  getMatchingPoints
}
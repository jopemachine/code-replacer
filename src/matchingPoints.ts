import { MatchingPoint } from './type/matchingPoint';
import {
  handleSpecialCharEscapeInTemplateLValue,
  Template,
} from './template';
import matchAll from './matchAll';

export class MatchingPoints extends Array {
  constructor () {
    super();
  }

  [x: number]: MatchingPoint;

  public replacingKey?: string;

  public pushIndex ({
    matchingPtIdx,
    matchingStr,
    replacedString,
  }: {
    matchingPtIdx: number,
    matchingStr: string,
    replacedString: string,
  }) {
    for (
      let otherPtsCandidateIdx = matchingPtIdx + 1;
      otherPtsCandidateIdx < this.length;
      otherPtsCandidateIdx++
    ) {
      const otherPts: MatchingPoint = this[otherPtsCandidateIdx];

      for (const candItem of otherPts) {
        candItem.index += replacedString.length - matchingStr.length;
      }
    }
  }

  public sortMatchingPoints () {
    for (
      let matchingPtIdx: number = 0;
      matchingPtIdx < this.length;
      matchingPtIdx++
    ) {
      const cands: MatchingPoint = this[matchingPtIdx];
      cands.leastIdx = Number.MAX_SAFE_INTEGER;

      for (let candIdx = 0; candIdx < cands.length; candIdx++) {
        if (cands.leastIdx > cands[candIdx].index) {
          cands.leastIdx = cands[candIdx].index;
        }
      }
    }

    // Sort matching points to match in asc order
    this.sort((lPt: MatchingPoint, rPt: MatchingPoint) => {
      return lPt.leastIdx - rPt.leastIdx;
    });
  }

  public addMatchingPoint ({
    srcLine,
    replacingKey,
    template
  }: {
    srcLine: string;
    replacingKey: string;
    template: Template;
  }) {
    // reg of replacingKey is already processed
    const escapedKey = handleSpecialCharEscapeInTemplateLValue(
      replacingKey
    );

    const lvalue: string = template.getGroupKeyForm(escapedKey);
    const replacingKeyReg: RegExp = new RegExp(lvalue);
    const replacingKeyMatchingPts: Generator<
      RegExpExecArray,
      void,
      unknown
    > = matchAll(srcLine, replacingKeyReg);

    for (const replacingKeyMatchingPt of replacingKeyMatchingPts) {
      let existingMatchingPtIdx: number = -1;

      for (
        let matchingPtIdx: number = 0;
        matchingPtIdx < this.length;
        matchingPtIdx++
      ) {
        const cands: MatchingPoint = this[matchingPtIdx];
        const candsArr: RegExpExecArray = cands[0];
        const longestStrInMatchingPt: string = candsArr[0];
        const replacingKeyMatchingStr: string = replacingKeyMatchingPt[0];

        if (
          replacingKeyMatchingStr === longestStrInMatchingPt ||
          !longestStrInMatchingPt.includes(replacingKeyMatchingStr)
        ) {
          continue;
        }

        // Should be same matching point.
        if (
          longestStrInMatchingPt.length >
          replacingKeyMatchingPt.index - candsArr.index
        ) {
          existingMatchingPtIdx = matchingPtIdx;
          break;
        }
      }

      this.replacingKey = replacingKey;
      if (existingMatchingPtIdx === -1) {
        this.push([replacingKeyMatchingPt]);
      } else {
        this[existingMatchingPtIdx].push(replacingKeyMatchingPt);
      }
    }
  }
}

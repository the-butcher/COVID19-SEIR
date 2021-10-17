import { BaseData } from './../basedata/BaseData';
import { Statistics } from '../../util/Statistics';
import { IDataCompare, StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { AgeGroup } from './../../common/demographics/AgeGroup';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { IDataItem } from './ModelStateIntegrator';

export interface IContactCorrection {
    totalRatio: number;
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}

export class ContactAdapter {

    private readonly modificationContactA: ModificationContact;
    private readonly modificationContactB: ModificationContact;

    constructor(modificationContactA: ModificationContact, modificationContactB: ModificationContact) {
        this.modificationContactA = modificationContactA;
        this.modificationContactB = modificationContactB;
    }

    calculateSolvable(ageGroup: AgeGroup, stepDataset: IDataItem[], weight: number): IDataCompare {

        const stepDataA = stepDataset[0];
        const stepDataB = stepDataset[stepDataset.length - 1];

        const casesA = StrainUtil.findCases(stepDataA, ageGroup);
        const casesB = StrainUtil.findCases(stepDataB, ageGroup);

        // the delta of actual average cases that would have to be solved with this step
        return casesB;

        // const offsetA = (casesA.data + 1000) / (casesA.base + 1000);
        // const offsetB = (casesB.data + 1000) / (casesB.base + 1000);

        // const offsetA = (casesA.data + 1000) / (casesA.base + 1000);
        // const offsetB = (casesB.data + 1000) / (casesB.base + 1000);

        // // now if a is closer to the curve it's value must be a better "match"
        // const offsetRatio = offsetA / offsetB;

        // // return Math.max(0, Math.min(1, Math.log10(offsetB) / 10));

        // return offsetRatio;


    }

    // calculateMultiplier(contactCategory: string, ageGroup: AgeGroup, stepDataset: IDataItem[], caseRatio: number): IContactCorrection {

    //     const stepDataPrev = stepDataset[stepDataset.length - 2];
    //     const stepDataCurr = stepDataset[stepDataset.length - 1];

    //     const casesB = StrainUtil.findCases(stepDataCurr, ageGroup);
    //     const totalRatio = casesB.data / casesB.base;

    //     const slopeB = StrainUtil.findSlope(stepDataPrev, stepDataCurr, ageGroup);
    //     const slopeDelta = slopeB.base - slopeB.data;
    //     // console.log('slopeDelta multiplier', ageGroup.getName(), slopeB, slopeDelta.toFixed(4));

    //     const prevMultA = this.modificationContactA.getCategoryValue(contactCategory);
    //     const currMultA = Math.max(0, Math.min(1, prevMultA - Math.log10(totalRatio) / caseRatio));

    //     let casesOSumBase = 0;
    //     let casesOSumData = 0;
    //     for (let stepDataIndex = 1; stepDataIndex < stepDataset.length - 1; stepDataIndex++) {
    //         const stepData = stepDataset[stepDataIndex];
    //         const casesO = StrainUtil.findCases(stepData, ageGroup);
    //         casesOSumBase += casesO.base;
    //         casesOSumData += casesO.data;
    //     }
    //     let casesOAvg = casesOSumData / casesOSumBase;

    //     const prevMultB = this.modificationContactB.getCategoryValue(contactCategory);
    //     const currMultB = Math.max(0, Math.min(1, prevMultB + slopeDelta / 10));

    //     return {
    //         totalRatio,
    //         prevMultA,
    //         currMultA,
    //         prevMultB,
    //         currMultB
    //     };

    // }

    // calculateCorrection(ageGroup: AgeGroup, stepDataset: IDataItem[]): IContactCorrection {

    //     const stepDataPrev = stepDataset[stepDataset.length - 2];
    //     const stepDataCurr = stepDataset[stepDataset.length - 1];

    //     const casesB = StrainUtil.findCases(stepDataCurr, ageGroup);
    //     const totalRatio = casesB.data / casesB.base;

    //     const slopeB = StrainUtil.findSlope(stepDataPrev, stepDataCurr, ageGroup);
    //     const slopeDelta = slopeB.base - slopeB.data;
    //     // console.log('slopeDelta correction', ageGroup.getName(), slopeB, slopeDelta.toFixed(4));

    //     const prevMultA = this.modificationContactA.getCorrectionValue('other', ageGroup.getIndex())
    //     const currMultA = Math.max(0.00, Math.min(3, prevMultA - Math.log10(totalRatio) / 10));

    //     const prevMultB = this.modificationContactB.getCorrectionValue('other', ageGroup.getIndex())
    //     const currMultB = Math.max(0.00, Math.min(3, prevMultB + slopeDelta / 10));

    //     return {
    //         totalRatio,
    //         prevMultA,
    //         currMultA,
    //         prevMultB,
    //         currMultB
    //     };

    // }

}
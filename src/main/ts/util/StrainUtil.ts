import { AgeGroup } from './../common/demographics/AgeGroup';
import { BaseData } from './../model/basedata/BaseData';
import { IDataItem } from './../model/state/ModelStateIntegrator';
import { TimeUtil } from './TimeUtil';
import { Weibull } from './Weibull';

export interface IDataCompare {
    base: number,
    data: number
}

export class StrainUtil {

    /**
     * calculate a discovery rate for a given day
     * assumptions / simplifications made:
     * -- base discovery rate (i.e. 30% matches a given positivity rate, i.e. 0.05)
     * -- an exponent is calculated that produce 100
     * @param baseDiscoveryRate
     * @param basePositivityRate
     * @param positivityRate
     * @returns
     */
    static calculateDiscoveryRate(baseDiscoveryRate: number, basePositivityRate: number, positivityRate: number): number {
        return 0.01 / (positivityRate + 0.01) - 0.01;
        // return  Math.pow(1 - positivityRate, Math.log(baseDiscoveryRate) / Math.log(1 - basePositivityRate));
    }

    static calculateLatency(serialInterval: number, intervalScale: number) {
        return serialInterval - serialInterval * intervalScale * Weibull.getInstance().getNormalizedMean();
    }

    static calculateInfecty(serialInterval: number, intervalScale: number) {
        return serialInterval * intervalScale;
    }

    static calculateIntervalScale(latency: number, serialInterval: number): number {
        return (latency - serialInterval) / (Weibull.getInstance().getNormalizedMean() * -serialInterval);
    }

    static calculateValueB(valueA: number, r0: number, instantA: number, instantB: number, serialInterval: number): number {

        // instant ratio
        const instantR = (instantB - instantA) / TimeUtil.MILLISECONDS_PER____DAY / serialInterval;

        return valueA * Math.pow(r0, instantR);

    }

    /**
     * calculate R0 from the given values
     * @param valueA value at instantA
     * @param valueB value at instantB
     * @param instantA reference instant for valueA
     * @param instantB reference instant for valueB
     * @param serialInterval reference interval (taken from the strain)
     */
    static calculateR0(valueA: number, valueB: number, instantA: number, instantB: number, serialInterval: number): number {

        // value ratio
        const valueR = valueB / valueA;

        // instant ratio
        const instantR = (instantB - instantA) / TimeUtil.MILLISECONDS_PER____DAY / serialInterval;

        return Math.exp(Math.log(valueR) / instantR);

    }

    // /**
    //  * find the error ration (by which ratio cases in the given item are off from the base data cases)
    //  * @param dataItem
    //  * @param ageGroup
    //  * @returns
    //  */
    //  static findMultiplierRatio(dataItem: IDataItem, ageGroup: AgeGroup): number {
    //     const baseItem = BaseData.getInstance().findBaseDataItem(dataItem.instant);
    //     if (baseItem) {
    //         const ratio = dataItem.valueset[ageGroup.getName()].CASES / baseItem.getAverageCases(ageGroup.getIndex());
    //         return (ratio - 1) * 0.25 + 1;
    //     } else {
    //         return Number.NaN;
    //     }
    // }

    // static findCorrectionRatio(dataItem: IDataItem, ageGroup: AgeGroup): number {
    //     const baseItem = BaseData.getInstance().findBaseDataItem(dataItem.instant);
    //     if (baseItem) {
    //         const ratio = dataItem.valueset[ageGroup.getName()].CASES / baseItem.getAverageCases(ageGroup.getIndex());
    //         return (ratio - 1) * 0.5 + 1;
    //     } else {
    //         return Number.NaN;
    //     }
    // }


    static findCases(dataItem: IDataItem, ageGroup: AgeGroup): IDataCompare {

        const instant = dataItem.instant;

        const baseItem = BaseData.getInstance().findBaseDataItem(instant);
        const baseCases = baseItem.getAverageCases(ageGroup.getIndex());
        const dataCases = dataItem.valueset[ageGroup.getName()].CASES;

        return {
            base: baseCases,
            data: dataCases
        }

    }

    static findSlope(dataItemA: IDataItem, dataItemB: IDataItem, ageGroup: AgeGroup): IDataCompare {

        const instantA = dataItemA.instant;
        const instantB = dataItemB.instant;
        const days = (instantB - instantA) / TimeUtil.MILLISECONDS_PER____DAY;

        const casesA = StrainUtil.findCases(dataItemA, ageGroup);
        const casesB = StrainUtil.findCases(dataItemB, ageGroup);

        const baseSlope = (casesB.base - casesA.base) / days;
        const dataSlope = (casesB.data - casesA.data) / days;

        return {
            base: baseSlope,
            data: dataSlope
        }

    }


}
import { AgeGroup } from './../common/demographics/AgeGroup';
import { BaseData } from './../model/basedata/BaseData';
import { IDataItem } from './../model/state/ModelStateIntegrator';
import { TimeUtil } from './TimeUtil';
import { Weibull } from './Weibull';

export interface IDataCompare {
    base: number;
    data: number;
}

export class StrainUtil {

    /**
     * calculate a discovery rate for a given day
     * 1 / (trimmedPositivityRate * 260 - 1.3) + 0.14:
     * 0.0000      0.9413
     * 0.0100      0.9092
     * 0.0200      0.3964
     * 0.0400      0.2499
     * 0.3000      0.1530
     * 
     * 1 / (trimmedPositivityRate * 300 + 1.25) + 0.17 - trimmedPositivityRate / 10
     * 0.0000      0.9700
     * 0.0100      0.4043
     * 0.0200      0.3059
     * 0.0400      0.2415
     * 0.1000      0.1920
     * 
     * @param baseDiscoveryRate
     * @param basePositivityRate
     * @param positivityRate
     * @returns
     */
    static calculateDiscoveryRate(positivityRate: number): number {
        const trimmedPositivityRate = Math.max(0, positivityRate); // will produce max discovery rate ~0.94
        return 1 / (trimmedPositivityRate * 300 + 1.25) + 0.17 - trimmedPositivityRate / 10
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

        // console.log('Math.pow(r0, instantR)', instantR, r0, Math.pow(r0, instantR));

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

    static stdNormalDistribution (x: number) {
        return Math.pow(Math.E,-Math.pow(x,2)/2)/Math.sqrt(2*Math.PI);
    }

    static readonly RANDOM_SCALE_095 = 5 / 1.96;
    static readonly RANDOM_SCALE_068 = 5 / 1.00;

    /**
     * https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
     * @param scale
     * @returns
     */
    static randomGaussian(scale: number) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random() //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random()
        let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v )

        num = num / 10.0 + 0.5 // Translate to 0 -> 1
        if (num > 1 || num < 0)
          num = StrainUtil.randomGaussian(scale) // resample between 0 and 1 if out of range
        else {
          num = Math.pow(num, 1) // Skew
          num *= (scale + scale) // Stretch to fill range
          num -= scale // offset to min
        }
        return num;
      }


}
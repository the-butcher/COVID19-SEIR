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
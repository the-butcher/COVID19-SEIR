import { TimeUtil } from './TimeUtil';
import { valueToRelative } from '@amcharts/amcharts4/.internal/core/utils/Utils';
import { Weibull } from './Weibull';

export class StrainUtil {

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

}
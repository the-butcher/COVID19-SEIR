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

}
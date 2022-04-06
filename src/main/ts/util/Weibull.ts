import { ObjectUtil } from './ObjectUtil';

/**
 * https://en.wikipedia.org/wiki/Weibull_distribution
 */
export class Weibull {

    static getInstanceReproduction(): Weibull {
        if (ObjectUtil.isEmpty(this.instanceReproduction)) {
            this.instanceReproduction = new Weibull(2.1, 1);
        }
        return this.instanceReproduction;
    }

    static getInstanceRecovery(): Weibull {
        if (ObjectUtil.isEmpty(this.instanceImmunity)) {
            this.instanceImmunity = new Weibull(1, 5);
        }
        return this.instanceImmunity;
    }

    // static getInstanceVaccination(): Weibull {
    //     if (ObjectUtil.isEmpty(this.instanceVaccination)) {
    //         this.instanceVaccination = new Weibull(2, 5);
    //     }
    //     return this.instanceVaccination;
    // }

    private static instanceReproduction: Weibull;
    private static instanceImmunity: Weibull;
    // private static instanceVaccination: Weibull;

    private static g = 7;
    private static C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716 * Math.pow(10, -6), 1.5056327351493116 * Math.pow(10, -7)];

    private readonly k: number;
    private readonly g: number;
    private maxX: number;
    private maxD: number;

    private constructor(k: number, g: number) {

        this.k = k;
        this.g = g;

        this.maxX = 0;
        this.maxD = 1;
        let maxDCalc = 0;
        for (; this.maxX < 10; this.maxX += 0.001) {
            maxDCalc = this.getDistribution(this.maxX);
            if (maxDCalc > 0.999) {
                break;
            }
        }
        this.maxD = maxDCalc;

    }

    getVariance(): number {
        return Math.pow(this.g, 2) * (this.gamma(1 + 2 / this.k) - Math.pow(this.gamma(1 + 1 / this.k), 2));
    }

    getMean(): number {
        return this.g * this.gamma(1 + 1 / this.k);
    }

    getNormalizedMean(): number {
        return this.getMean() / this.maxX;
    }

    getDensity(x: number): number {
        return (this.k / this.g) * Math.pow(x / this.g, this.k - 1) * Math.exp(-Math.pow(x / this.g, this.k));
    }

    getNormalizedDensity(x: number): number {
        return this.getDensity(x * this.maxX) * this.maxX;
    }

    getDistribution(x: number): number {
        return (1 - Math.exp(-Math.pow(x / this.g, this.k))) / this.maxD;
    }

    getNormalizedDistribution(x: number): number {
        return this.getDistribution(x * this.maxX);
    }

    /**
     * https://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals
     */
    gamma(z: number): number {
        if (z < 0.5) {
            return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
        } else {
            z -= 1;
            let x = Weibull.C[0];
            for (let i = 1; i < Weibull.g + 2; i++) {
                x += Weibull.C[i] / (z + i);
            }
            const t = z + Weibull.g + 0.5;
            return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x;
        }
    }

    factorial(z: number) {
        return this.gamma(z + 1);
    }


}
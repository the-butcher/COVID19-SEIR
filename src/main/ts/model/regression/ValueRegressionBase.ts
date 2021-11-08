import regression, { DataPoint } from 'regression';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelInstants } from '../ModelInstants';
import { FDistribution } from './FDistribution';
import { IRegressionParams } from './IRegressionParams';
import { IRegressionResult } from './IRegressionResult';

export interface IWorkingHotellingParams {
    num: number;
    sse: number;
    avg: number;
    tss: number;
    wh2: number;
}

export abstract class ValueRegressionBase {

    // private readonly instant: number;
    private readonly instantA: number;
    private readonly instantB: number;
    private readonly polyWeight: number;
    private readonly equationParamsLin: number[];
    private readonly equationParamsPol: number[];
    private readonly originalValues: { [K in string]: number };
    private readonly modificationsContact: ModificationContact[];
    private whParams: IWorkingHotellingParams;

    constructor(params: IRegressionParams) {

        // this.instant = params.instant;
        this.instantA = params.instantA;
        this.instantB = params.instantB;
        this.polyWeight = params.polyWeight;
        this.equationParamsLin = [];
        this.equationParamsPol = [];
        this.originalValues = {};
        this.modificationsContact = params.modificationsContact;

    }

    protected setup(): void {

        // look into each category
        const regressionData: DataPoint[] = [];

        // reduce to modifications that are relevant for current settings
        const relevantModifications = this.modificationsContact.filter(m => m.getInstantA() >= this.instantA && m.getInstantA() <= this.instantB);
        relevantModifications.forEach(relevantModification => {
            regressionData.push([
                this.toRegressionX(relevantModification.getInstant()),
                this.toValueY(relevantModification)
            ]);

        });

        /**
         * raw data, should contain all modifications
         */
        this.modificationsContact.forEach(modificationContact => {
            this.originalValues[modificationContact.getInstant()] = this.toValueY(modificationContact);
        });

        // const regressionResultPol = regression.exponential(regressionData, { order: 3 });
        const regressionResultPol = regression.polynomial(regressionData, { order: 3 });
        const regressionResultLin = regression.linear(regressionData);

        // console.log('reg', regressionResultPol, regressionResultLin)

        // console.log(`X;Y`);
        // relevantModifications.forEach(relevantModification => {
        //     const regressionX = this.toRegressionX(relevantModification.getInstant());
        //     const regressionY = this.toValueY(relevantModification);
        //     console.log(`${regressionX.toLocaleString()};${regressionY.toLocaleString()}`);
        // });

        this.equationParamsPol.push(...regressionResultPol.equation);
        this.equationParamsLin.push(...regressionResultLin.equation);

        // calculate stats from
        // console.log('-----------------------------');

        // org.apache.commons.math3.stat.regression.SimpleRegression.java
        let n = 0;
        let xBar: number;
        let yBar: number;
        let sumX: number = 0;
        let sumXX: number = 0;
        let sumY: number = 0;
        let sumYY: number = 0;
        let sumXY: number = 0;

        for (let n=0; n<regressionData.length; n++) {
            const x = regressionData[n][0];
            const y = regressionData[n][1];
            // console.log(`regression.addData(${x}, ${y});`);
            if (n == 0) {
                xBar = x;
                yBar = y;
            } else {
                const fact1 = 1.0 + n;
                const fact2 = n / (1.0 + n);
                const dx = x - xBar;
                const dy = y - yBar;
                sumXX += dx * dx * fact2;
                sumYY += dy * dy * fact2;
                sumXY += dx * dy * fact2;
                xBar += dx / fact1;
                yBar += dy / fact1;
            }
            sumX += x;
        }

        // const sse = sumYY - sumXY * sumXY / sumXX;
        // console.log('sse', sse);
        // const meanSquareError = sumSquaredError / (regressionData.length - 2)
        // console.log('meanSquareError', meanSquareError);
        // const tss = sumYY;
        // console.log('tss', tss);
        // const avg = sumX / regressionData.length;
        // console.log('avg', avg);

        this.whParams = {
            num: regressionData.length,
            avg: sumX / regressionData.length,
            tss: sumYY,
            sse: sumYY - sumXY * sumXY / sumXX,
            wh2: new FDistribution().inverseCumulativeProbability95(regressionData.length - 2) * 2
        }

    }

    getRegressionResult(instant: number): IRegressionResult {

        if (instant > this.instantA) {

            // put instant into regressions space
            const x = this.toRegressionX(instant);

            // const regressionPol = this.equationParamsPol[0] * Math.exp(this.equationParamsPol[1] * regressionX); // 0.33e^(0.82x) Math.exp
            const regressionPol = Math.pow(x, 3) * this.equationParamsPol[0] + Math.pow(x, 2) * this.equationParamsPol[1] + x * this.equationParamsPol[2] + this.equationParamsPol[3];
            const regressionLin = x * this.equationParamsLin[0] + this.equationParamsLin[1];

            const ratioPol = this.polyWeight;
            const ratioLin = 1 - ratioPol;

            const y = regressionPol * ratioPol + regressionLin * ratioLin;

            // https://en.wikipedia.org/wiki/Working%E2%80%93Hotelling_procedure
            const term1a = this.whParams.sse / (this.whParams.num - 2);
            const term2a = 1 / this.whParams.num + Math.pow(x - this.whParams.avg, 2) / this.whParams.tss;
            const ci95 = Math.sqrt(this.whParams.wh2 * term1a * term2a);

            // const std = Math.sqrt(this.whParams.num) * (ci95 * 2) / 3.92;
            // console.log('std', ci95, std, ci95 * 2 / std);

            return {
                regression: y,
                ci95Min: y - ci95,
                ci95Max: y + ci95,
                ci95Dim: ci95,
                original: this.originalValues[instant] // will be undefined in many cases
            };

        } else {
            return {
                original: this.originalValues[instant], // will be undefined in many cases
                ci95Min: undefined,
                ci95Max: undefined,
                ci95Dim: undefined
            };
        }


    }

    /**
     * let the subclass provide an appropriate value
     * @param modificationContact
     */
    abstract toValueY(modificationContact: ModificationContact): number;

    /**
     * transform instant into a manageable value space in the range 0-1
     * @param instant
     * @returns
     */
    toRegressionX(instant: number): number {
        return (instant - ModelInstants.getInstance().getMinInstant()) / (ModelInstants.getInstance().getMaxInstant() - ModelInstants.getInstance().getMinInstant());
    };

}


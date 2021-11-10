import { IRegressionConfig } from './../../common/modification/IModificationValuesRegression';
import { TimeUtil } from './../../util/TimeUtil';
import regression, { DataPoint } from 'regression';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelInstants } from '../ModelInstants';
import { FDistribution } from './FDistribution';
import { IRegressionParams } from './IRegressionParams';
import { IRegressionResult } from './IRegressionResult';
import { ValueAxisBreak } from '@amcharts/amcharts4/charts';
import { ILoessResult } from './ILoessResult';

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

    private readonly modelValues: { [K in string]: number };
    private readonly loessValues: { [K in string]: ILoessResult };

    private readonly modificationsContact: ModificationContact[];
    private whParams: IWorkingHotellingParams;

    private loessModel: any;

    constructor(params: IRegressionParams) {

        // this.instant = params.instant;
        this.instantA = params.instantA;
        this.instantB = params.instantB;
        this.polyWeight = params.polyWeight;
        this.equationParamsLin = [];
        this.equationParamsPol = [];
        this.modelValues = {};
        this.loessValues = {};
        this.modificationsContact = params.modificationsContact;

    }

    protected setup(): void {

        // look into each category
        const regressionData: DataPoint[] = [];

        const minInstant = this.modificationsContact[0].getInstant();
        const maxInstant = this.modificationsContact[this.modificationsContact.length - 1].getInstant(); // last modification instance

        console.log('setup regression', TimeUtil.formatCategoryDateFull(minInstant), TimeUtil.formatCategoryDateFull(maxInstant));

        var Loess = require('loess')
        const x: number[] = [];
        const y: number[] = [];
        this.modificationsContact.forEach(modificationContact => {
            x.push(this.toRegressionX(modificationContact.getInstant()));
            y.push(this.toValueY(modificationContact));
        });
        var options = {span: 0.2, band: 0.95} // , degree: 1
        this.loessModel = new Loess.default({
            x,
            y
        }, options);

        this.modificationsContact.forEach(modificationContact => {

            const instant = modificationContact.getInstant();

            const x = this.toRegressionX(instant);
            const loessPrediction = this.loessModel.predict({
                x: [x]
            });

            if (instant >= this.instantA && instant <= this.instantB) {
                regressionData.push([
                    x,
                    loessPrediction.fitted[0]
                ]);
            }

            this.modelValues[instant] = this.toValueY(modificationContact)
            this.loessValues[instant] = {
                x,
                y: loessPrediction.fitted[0],
                semiOff: loessPrediction.halfwidth[0]
            }

        });


        // let modificationA: ModificationContact;
        // let modificationB: ModificationContact;
        // let instant = minInstant;
        // while ((modificationA = this.modificationsContact.find(m => m.getInstantB() > instant)) && (modificationB = this.modificationsContact.find(m => m.getInstantA() >= instant))) { // single equals sign on purpose!!

        //     const fraction = modificationB.getInstantA() !== modificationA.getInstantA() ? (instant - modificationA.getInstantA()) / (modificationB.getInstantA() - modificationA.getInstantA()) : 0;
        //     const valueYA = this.toValueY(modificationA);
        //     const valueYB = this.toValueY(modificationB);
        //     const valueYM = valueYA + (valueYB - valueYA) * fraction;

        //     /**
        //      * relevant data
        //      */
        //     if (instant >= this.instantA && instant <= this.instantB) {

        //         regressionData.push([
        //             this.toRegressionX(instant),
        //             valueYM
        //         ]);

        //     }

        //     if (!modificationA || !modificationB) {
        //         console.log(TimeUtil.formatCategoryDateFull(instant), modificationA, modificationB);
        //     }

        //     this.originalValues[instant] = model.predict(this.toRegressionX(instant)); // valueYM;

        //     instant += TimeUtil.MILLISECONDS_PER____DAY;

        // }

        // this is possibly dangerous - build another regression on top of the loess regression

        const regressionResultPol = regression.polynomial(regressionData, { order: 3 });
        const regressionResultLin = regression.linear(regressionData);

        this.equationParamsPol.push(...regressionResultPol.equation);
        this.equationParamsLin.push(...regressionResultLin.equation);

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

    getLastLoessValue(): ILoessResult {
        const keys = Object.keys(this.loessValues);
        return this.loessValues[keys[keys.length - 1]];
    }

    getRegressionResult(instant: number): IRegressionResult {

        if (instant > this.instantA) {

            // put instant into regressions space
            const x = this.toRegressionX(instant);


            // const loessPrediction = this.loessModel.predict({
            //     x: [x]
            // })
            // const wh2 = loessPrediction.halfwidth[0];

            // const regressionPol = loessPrediction.fitted[0];
            // // const ci95 = loessPrediction.halfwidth[0];

            // // const regressionPol = this.equationParamsPol[0] * Math.exp(this.equationParamsPol[1] * regressionX);
            const regressionPol = Math.pow(x, 3) * this.equationParamsPol[0] + Math.pow(x, 2) * this.equationParamsPol[1] + x * this.equationParamsPol[2] + this.equationParamsPol[3];
            const regressionLin = x * this.equationParamsLin[0] + this.equationParamsLin[1];

            const ratioPol = this.polyWeight;
            const ratioLin = 1 - ratioPol;
            const y = regressionPol * ratioPol + regressionLin * ratioLin;

            // find last valid loess prediction
            const loessValue = this.getLastLoessValue();
            const yOff = loessValue.semiOff;

            const termLa = this.whParams.sse / (this.whParams.num - 2);
            const termLb = Math.pow(x - loessValue.x, 2) / this.whParams.tss;
            const ci95 = yOff + Math.pow(x - loessValue.x, 2); // Math.sqrt(yOffU * termLa * termLb);

            // // https://en.wikipedia.org/wiki/Working%E2%80%93Hotelling_procedure
            // const term1a = this.whParams.sse / (this.whParams.num - 2);
            // const term2a = 1 / this.whParams.num + Math.pow(x - this.whParams.avg, 2) / this.whParams.tss;
            // const ci95 = Math.sqrt(this.whParams.wh2 * term1a * term2a);

            return {
                regression: y,
                ci95Min: y - ci95,
                ci95Max: y + ci95,
                ci95Dim: ci95,
                model: this.modelValues[instant], // will be undefined in many cases
                loess: this.loessValues[instant]
            };

        } else {
            return {
                model: this.modelValues[instant], // will be undefined in many cases
                loess: this.loessValues[instant],
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


import regression, { DataPoint } from 'regression';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelInstants } from '../ModelInstants';
import { TimeUtil } from './../../util/TimeUtil';
import { FDistribution } from './FDistribution';
import { ILoessResult } from './ILoessResult';
import { IRegressionParams } from './IRegressionParams';
import { IRegressionResult } from './IRegressionResult';

export interface IWorkingHotellingParams {
    num: number;
    sse: number;
    avg: number;
    tss: number;
    wh2: number;
    off: number;

    /**
     * instant of the narrowest part in the prediction
     */
    nro: number;

}

export interface ILoessInput {
    x: number[];
    y?: number[];
    i?: number[]; // instants
    m?: number[]; // model values
}
export abstract class ValueRegressionBase {

    // private readonly instant: number;
    private readonly instantA: number;
    private readonly instantB: number;
    private readonly polyWeight: number;
    private readonly equationParamsLin: number[];
    private readonly equationParamsPol: number[];

    // private readonly modelValues: { [K in string]: number };
    private readonly loessValues: ILoessResult[];

    private readonly modificationsContact: ModificationContact[];
    private whParams: IWorkingHotellingParams;

    constructor(params: IRegressionParams) {

        // this.instant = params.instant;
        this.instantA = params.instantA;
        this.instantB = params.instantB;
        this.polyWeight = params.polyWeight;
        this.equationParamsLin = [];
        this.equationParamsPol = [];
        this.loessValues = [];
        this.modificationsContact = params.modificationsContact;

        // console.log('last mod', TimeUtil.formatCategoryDateFull(this.modificationsContact[this.modificationsContact.length - 1].getInstantA()));

    }

    collectLoessModelInput(): ILoessInput {

        const xValues: number[] = [];
        const yValues: number[] = [];
        this.modificationsContact.forEach(modificationContact => {
            xValues.push(ValueRegressionBase.toRegressionX(modificationContact.getInstant()));
            yValues.push(this.toValueY(modificationContact));
        });

        return {
            x: xValues,
            y: yValues
        }

    }

    collectLoessInterpolationInput(): ILoessInput {

        const xValues: number[] = [];
        const iValues: number[] = [];
        const mValues: number[] = [];

        for (let i=1; i<this.modificationsContact.length; i++) {

            const modificationContactA = this.modificationsContact[i - 1];
            const modificationContactB = this.modificationsContact[i - 1];

            const instantA = modificationContactA.getInstantA();
            const instantB = modificationContactB.getInstantA();

            const valueXA = ValueRegressionBase.toRegressionX(instantA);
            const valueXB = ValueRegressionBase.toRegressionX(instantB);

            const valueYA = this.toValueY(modificationContactA);
            const valueYB = this.toValueY(modificationContactB);

            iValues.push((instantA + instantB) / 2);
            xValues.push((valueXA + valueXB) / 2);
            mValues.push((valueYA + valueYB) / 2);

        }
        // this.modificationsContact.forEach(modificationContact => {

        //     const instant = modificationContact.getInstantA();
        //     const valueX = ValueRegressionBase.toRegressionX(instant);
        //     const valueY = this.toValueY(modificationContact);

        //     iValues.push(instant);
        //     xValues.push(valueX);
        //     mValues.push(valueY);

        // });

        return {
            x: xValues,
            i: iValues,
            m: mValues
        }

    }

    protected setup(): void {

        // look into each category
        const regressionInput: DataPoint[] = [];

        var Loess = require('loess')

        const loessModelInput = this.collectLoessModelInput();
        const loessOptions = {span: 0.2, band: 0.5} // , degree: 1
        const loessModel = new Loess.default(loessModelInput, loessOptions);

        const loessInterpolationInput = this.collectLoessInterpolationInput();
        const loessInterpolation = loessModel.predict(loessInterpolationInput);

        for (let i=0; i<loessInterpolationInput.i.length; i++) {

            const instant = loessInterpolationInput.i[i];
            if (instant >= this.instantA && instant <= this.instantB) {
                regressionInput.push([
                    loessInterpolationInput.x[i],
                    loessInterpolation.fitted[i]
                ]);
            }

            this.loessValues.push({
                x: loessInterpolationInput.x[i],
                y: loessInterpolation.fitted[i],
                o: loessInterpolation.halfwidth[0],
                m: loessInterpolationInput.m[i],
                i: instant
            });

        }


        const regressionResultPol = regression.polynomial(regressionInput, { order: 3 });
        const regressionResultLin = regression.linear(regressionInput);

        this.equationParamsPol.push(...regressionResultPol.equation);
        this.equationParamsLin.push(...regressionResultLin.equation);

        // org.apache.commons.math3.stat.regression.SimpleRegression.java
        let n = 0;
        let xBar: number;
        let yBar: number;
        let sumX: number = 0;
        let sumXX: number = 0;
        // let sumY: number = 0;
        let sumYY: number = 0;
        let sumXY: number = 0;

        for (let n=0; n<regressionInput.length; n++) {

            const x = regressionInput[n][0];
            const y = regressionInput[n][1];

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



        // preliminary wh-params
        this.whParams = {
            num: regressionInput.length,
            avg: sumX / regressionInput.length,
            tss: sumYY,
            sse: sumYY - sumXY * sumXY / sumXX,
            wh2: new FDistribution().inverseCumulativeProbability95(regressionInput.length - 2) * 2,
            off: 0,
            nro: 0
        }

        // find narrowest part, so offset can be adjusted to fit loess width
        const minInstant = this.modificationsContact[0].getInstant(); // first modification instance
        const maxInstant = this.modificationsContact[this.modificationsContact.length - 1].getInstant(); // last modification instance

        let nroInstant = -1;
        let nroCi95 = Number.MAX_VALUE;
        for (let instant = minInstant; instant <= maxInstant; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const x = ValueRegressionBase.toRegressionX(instant);
            const ci95 = this.calculateCi95(x);
            if (ci95 < nroCi95) {
                nroCi95 = ci95;
                nroInstant = instant;
            }
        }

        const loessValue = this.findLoessValue(nroInstant);
        this.whParams.off = loessValue.o - nroCi95;
        this.whParams.nro = nroInstant;

        // console.log('adjusted wh2', TimeUtil.formatCategoryDateFull(nroInstant), this.getName(), 'off', this.whParams.off, 'nro', TimeUtil.formatCategoryDateFull(this.whParams.nro));

    }

    calculateCi95(x: number) {

        // // https://en.wikipedia.org/wiki/Working%E2%80%93Hotelling_procedure
        // const term1a = this.whParams.sse / (this.whParams.num - 2);
        // const term2a = 1 / this.whParams.num + Math.pow(x - this.whParams.avg, 2) / this.whParams.tss;
        // const ci95 = Math.sqrt(this.whParams.wh2 * term1a * term2a);

        const termLa = this.whParams.sse / (this.whParams.num - 2);
        const termLb = Math.pow((x - this.whParams.avg), 2) / this.whParams.tss;
        return this.whParams.off + Math.sqrt(this.whParams.wh2 * termLa * termLb);

    }

    findLoessValue(instant: number): ILoessResult {

        for (let i=1; i<this.loessValues.length; i++) {

            if (this.loessValues[i].i >= instant) {

                const loessValueA = this.loessValues[i - 1];
                const loessValueB = this.loessValues[i];

                const fraction = (instant - loessValueA.i) / (loessValueB.i - loessValueA.i);
                return {
                    x: loessValueA.x + fraction * (loessValueB.x - loessValueA.x),
                    y: loessValueA.y + fraction * (loessValueB.y - loessValueA.y),
                    i: loessValueA.i + fraction * (loessValueB.i - loessValueA.i),
                    o: loessValueA.o + fraction * (loessValueB.o - loessValueA.o),
                    m: loessValueA.m + fraction * (loessValueB.m - loessValueA.m),
                }

            }

        }

    }

    getRegressionResult(instant: number): IRegressionResult {

        // within regression range?
        const lastLoessInstant = this.loessValues[this.loessValues.length - 1].i;
        if (instant >= this.instantA) {

            // put instant into regressions space
            const x = ValueRegressionBase.toRegressionX(instant);
            const loessValue = this.findLoessValue(instant); // this.loessValues.find(v => v.i === instant);

            /**
             * polynomial and linear regression data
             */
            const regressionPol = Math.pow(x, 3) * this.equationParamsPol[0] + Math.pow(x, 2) * this.equationParamsPol[1] + x * this.equationParamsPol[2] + this.equationParamsPol[3];
            const regressionLin = x * this.equationParamsLin[0] + this.equationParamsLin[1];

            /**
             * mix linear and polynomial as configured in modification
             */
            const ratioPol = this.polyWeight;
            const ratioLin = 1 - ratioPol;

            let regression = regressionPol * ratioPol + regressionLin * ratioLin;
            let ci95 = this.calculateCi95(x);
            if (instant < this.whParams.nro) {

                regression = loessValue.y;
                ci95 = loessValue.o;

            } else if (instant <= lastLoessInstant) {

                const fraction = (instant - this.whParams.nro) / (lastLoessInstant - this.whParams.nro);
                regression = loessValue.y * (1 - fraction) + regression * fraction;

            }

            let ci95Min = regression - ci95;
            let ci95Max = regression + ci95;

            if (ci95Min <= 0) {
                ci95Min = 0;
                regression = (ci95Max - ci95Min) / 2;
                ci95Max = regression + ci95;
            }

            return {
                loess: this.findLoessValue(instant),
                regression: regression,
                ci95Min,
                ci95Max,
                ci95Dim: ci95
            };

        } else {

            const loessValue = this.loessValues.find(v => v.i === instant);
            return {
                loess: loessValue,
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

    abstract getName(): string;

    /**
     * transform instant into a manageable value space in the range 0-1
     * @param instant
     * @returns
     */
    static toRegressionX(instant: number): number {
        return (instant - ModelInstants.getInstance().getMinInstant()) / (ModelInstants.getInstance().getMaxInstant() - ModelInstants.getInstance().getMinInstant());
    };

}


import regression, { DataPoint } from 'regression';
import { IModification } from '../../common/modification/IModification';
import { IModificationValues } from '../../common/modification/IModificationValues';
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
export abstract class ValueRegressionBase<M extends IModification<IModificationValues>> {

    // private readonly instant: number;
    private readonly instantA: number;
    private readonly instantB: number;
    private readonly polyShares: number[];


    private readonly modifications: M[];
    private whParams: IWorkingHotellingParams;

    private loessModel01000: any;
    private loessModel00500: any;
    private loessModel00250: any;
    private readonly loessValues01000: ILoessResult[];
    private readonly loessValues00500: ILoessResult[];
    private readonly loessValues00250: ILoessResult[];

    constructor(params: IRegressionParams<M>) {

        this.instantA = params.instantA;
        this.instantB = params.instantB;
        this.polyShares = params.polyShares;
        this.loessValues01000 = [];
        this.loessValues00500 = [];
        this.loessValues00250 = [];
        this.modifications = params.modifications.filter(m => m.getInstantA() <= this.instantB);

    }

    collectLoessModelInput(): ILoessInput {

        const xValues: number[] = [];
        const yValues: number[] = [];

        this.modifications.forEach(modification => {
            xValues.push(ValueRegressionBase.toRegressionX(modification.getInstantA()));
            yValues.push(this.toValueY(modification));
        });

        return {
            x: xValues,
            y: yValues
        }

    }

    collectLoessPredictionInput(): ILoessInput {

        const xValues: number[] = [];
        const iValues: number[] = [];
        const mValues: number[] = [];

        const minInstant = ModelInstants.getInstance().getMinInstant();
        const maxInstant = ModelInstants.getInstance().getMaxInstant();

        for (let i = minInstant; i <= maxInstant; i += TimeUtil.MILLISECONDS_PER____DAY) {

            const x = ValueRegressionBase.toRegressionX(i);

            const modification = this.modifications.find(m => m.getInstantA() === i);
            const m = modification && this.toValueY(modification);

            iValues.push(i);
            xValues.push(x);
            mValues.push(m);

        }

        return {
            x: xValues,
            i: iValues,
            m: mValues
        }

    }

    protected setup(): void {


        var Loess = require('loess')

        /**
         * pure modification values
         */
        const loessModelInput = this.collectLoessModelInput();

        this.loessModel01000 = new Loess.default(loessModelInput, {
            span: 1.00,
             band: 0.50
        });
        this.loessModel00500 = new Loess.default(loessModelInput, {
            span: 0.50,
             band: 0.50
        });
        this.loessModel00250 = new Loess.default(loessModelInput, {
            span: 0.25,
             band: 0.50
        });

        /**
         * daily input
         */
        const loessPredictionInput = this.collectLoessPredictionInput();
        const loessPrediction01000 = this.loessModel01000.predict(loessPredictionInput);
        const loessPrediction00500 = this.loessModel00500.predict(loessPredictionInput);
        const loessPrediction00250 = this.loessModel00250.predict(loessPredictionInput);
        const regressionInput: DataPoint[] = [];

        for (let i=0; i<loessPredictionInput.i.length; i++) {

            const instant = loessPredictionInput.i[i];
            if (instant >= this.instantA && instant <= this.instantB && loessPredictionInput.m[i]) {
                regressionInput.push([
                    loessPredictionInput.x[i],
                    loessPredictionInput.m[i]
                ]);
            }

            this.loessValues01000.push({
                x: loessPredictionInput.x[i],
                y: loessPrediction01000.fitted[i],
                o: loessPrediction01000.halfwidth[i],
                m: loessPredictionInput.m[i],
                i: instant
            });

            this.loessValues00500.push({
                x: loessPredictionInput.x[i],
                y: loessPrediction00500.fitted[i],
                o: loessPrediction00500.halfwidth[i],
                m: loessPredictionInput.m[i],
                i: instant
            });

            this.loessValues00250.push({
                x: loessPredictionInput.x[i],
                y: loessPrediction00250.fitted[i],
                o: loessPrediction00250.halfwidth[i],
                m: loessPredictionInput.m[i],
                i: instant
            });

        }

        // const sse = sumYY - sumXY * sumXY / sumXX;
        // console.log('sse', sse);
        // const meanSquareError = sumSquaredError / (regressionData.length - 2)
        // console.log('meanSquareError', meanSquareError);
        // const tss = sumYY;
        // console.log('tss', tss);
        // const avg = sumX / regressionData.length;
        // console.log('avg', avg);
        // let n = 0;
        let xBar: number;
        let yBar: number;
        let sumX: number = 0;
        let sumXX: number = 0;
        // let sumY: number = 0;
        let sumYY: number = 0;
        let sumXY: number = 0;

        for (let n = 0; n < regressionInput.length; n++) {

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

        this.calculateWhParams();

    }

    calculateWhParams(): void {

        // find narrowest part, so offset can be adjusted to fit loess width
        const minInstant = this.modifications[0].getInstantA(); // first modification instance
        const maxInstant = this.modifications[this.modifications.length - 1].getInstantA(); // last modification instance

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

        /**
         * should no be important which loess value container is picked (as long as the band width does not change)
         */
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

        const loessValue01000 = this.findOrInterpolateLoessValue(instant, this.loessValues01000);
        const loessValue00500 = this.findOrInterpolateLoessValue(instant, this.loessValues00500);
        const loessValue00250 = this.findOrInterpolateLoessValue(instant, this.loessValues00250);

        const share01000 = this.polyShares[0];
        const share00500 = this.polyShares[1] - this.polyShares[0];
        const share00250 = 1 - this.polyShares[1];

        let m: number;
        if (loessValue01000.m && loessValue00500.m && loessValue00250.m) {
            m = loessValue01000.m * share01000 + loessValue00500.m * share00500 + loessValue00250.m * share00250;
        } 
        const x = loessValue01000.x * share01000 + loessValue00500.x * share00500 + loessValue00250.x * share00250;
        const y = loessValue01000.y * share01000 + loessValue00500.y * share00500 + loessValue00250.y * share00250;
        const i = loessValue01000.i * share01000 + loessValue00500.i * share00500 + loessValue00250.i * share00250;
        const o = loessValue01000.o * share01000 + loessValue00500.o * share00500 + loessValue00250.o * share00250;

        return {
            x,
            y,
            i,
            o,
            m
        }

    }

    findOrInterpolateLoessValue(instant: number, loessValues: ILoessResult[]): ILoessResult {

        for (let i=1; i<loessValues.length; i++) {

            if (loessValues[i].i === instant) {

                return loessValues[i];

            } else if (loessValues[i].i >= instant) {

                const loessValueA = loessValues[i - 1];
                const loessValueB = loessValues[i];

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

        // put instant into regressions space
        const x = ValueRegressionBase.toRegressionX(instant);
        const loessValue = this.findLoessValue(instant);

        if (instant >= this.whParams.nro) {

            let regression = loessValue.y;

            let ci95 = this.calculateCi95(x);
            let ci95Min = regression - ci95;
            let ci95Max = regression + ci95;

            if (ci95Min <= 0) {
                ci95Min = 0;
                regression = (ci95Max - ci95Min) / 2;
                ci95Max = regression + ci95;
            }

            return {
                loess: loessValue,
                regression: regression,
                ci95Min,
                ci95Max,
                ci95Dim: ci95
            };

        } else {

            // const loessValue01000 = this.loessValues01000.find(v => v.i === instant);
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
     * @param modification
     */
    abstract toValueY(modification: M): number;

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


import { ModificationResolverContact } from './../../common/modification/ModificationResolverContact';
import regression, { DataPoint } from 'regression';
import { ModelInstants } from '../ModelInstants';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { IRegressionParams, IRegressionResult } from './Regression';

export abstract class ValueRegressionBase {

    private readonly instant: number;
    private readonly modificationCount: number;
    private readonly equationParams: number[];
    private readonly originalValues: { [K in string]: number };

    constructor(params: IRegressionParams) {
        this.instant = params.instant;
        this.modificationCount = params.modificationCount;
        this.equationParams = [];
        this.originalValues = {};
    }

    setup(modificationsContact: ModificationContact[]) {

        // look into each category
        const regressionData: DataPoint[] = [];


        for (let i = Math.max(0, modificationsContact.length - this.modificationCount); i < modificationsContact.length; i++) {
            const modificationContact = modificationsContact[i];
            regressionData.push([
                this.toRegressionX(modificationContact.getInstant()),
                this.toValueY(modificationContact)
            ]);
        }
        // const regressionResult = regression.polynomial(regressionData, { order: 2 });
        const regressionResult = regression.polynomial(regressionData, { order: 3 });
        // const regressionResult = regression.linear(regressionData);
        this.equationParams.push(...regressionResult.equation);

        modificationsContact.forEach(modificationContact => {
            this.originalValues[modificationContact.getInstant()] = this.toValueY(modificationContact);
        });

    }

    getRegressionResult(instant: number): IRegressionResult {
        const regressionX = this.toRegressionX(instant);
        return {
            // regression: Math.pow(regressionX, 2) * this.equationParams[0] + regressionX * this.equationParams[1] + this.equationParams[2],
            regression: Math.pow(regressionX, 3) * this.equationParams[0] + Math.pow(regressionX, 2) * this.equationParams[1] + regressionX * this.equationParams[2] + this.equationParams[3],
            // regression: regressionX * this.equationParams[0] + this.equationParams[1],
            original: this.originalValues[instant] // will be undefined in many cases
        };
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
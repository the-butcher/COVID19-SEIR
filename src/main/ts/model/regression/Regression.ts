import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ValueRegressionCorrection } from './ValueRegressionCorrection';
import { ValueRegressionMultiplier } from './ValueRegressionMultiplier';

export interface IRegressionParams {

    /**
     * the point where regression values start
     */
    instant: number

    /**
     * the point in time where points start to be considered for regression
     */
    instantMods: number;

    instantPoly: number;

    modificationsContact: ModificationContact[];

}

export interface IRegressionResult {
    regression: number;
    original?: number;
}

export class Regression {

    private readonly valueRegressionsMultiplier: { [K in string]: ValueRegressionMultiplier };
    private readonly valueRegressionsCorrection: { [K in string]: ValueRegressionCorrection };

    constructor(params: IRegressionParams) {

        this.valueRegressionsMultiplier = {};
        this.valueRegressionsCorrection = {};
        /**
         * multipliers
         */
        Demographics.getInstance().getCategories().forEach(category => {

            const valueRegression = new ValueRegressionMultiplier({
                ...params,
                contactCategory: category.getName()
            });
            this.valueRegressionsMultiplier[category.getName()] = valueRegression;

        });

        /**
         * corrections
         */
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

            const valueRegression = new ValueRegressionCorrection({
                ...params,
                ageGroupIndex: ageGroup.getIndex()
            });
            this.valueRegressionsCorrection[ageGroup.getIndex()] = valueRegression;

        });

    }

    getMultiplier(instant: number, contactCategory: string): IRegressionResult {
        return this.valueRegressionsMultiplier[contactCategory].getRegressionResult(instant);
    }

    getCorrection(instant: number, ageGroupIndex: number): IRegressionResult {
        if (ageGroupIndex >= 0 && ageGroupIndex < Demographics.getInstance().getAgeGroups().length) {
            return this.valueRegressionsCorrection[ageGroupIndex].getRegressionResult(instant);
        } else {
            return {
                regression: 0
            }
        }
    }

}
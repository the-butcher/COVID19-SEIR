import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { Modifications } from '../../common/modification/Modifications';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ValueRegressionCorrection } from './ValueRegressionCorrection';
import { ValueRegressionMultiplier } from './ValueRegressionMultiplier';

export interface IRegressionParams {
    modificationCount: number;
}

export interface IRegressionResult {
    regression: number;
    original?: number;
}

export class Regression {

    static getInstance(): Regression {
        if (ObjectUtil.isEmpty(this.instance) || this.instance.instant < Modifications.getInstance().getLastUpdate()) {
            this.instance = new Regression({
                modificationCount: 30
            });
        }
        return this.instance;
    }
    private static instance: Regression;

    private readonly valueRegressionsMultiplier: { [K in string]: ValueRegressionMultiplier };
    private readonly valueRegressionsCorrection: { [K in string]: ValueRegressionCorrection };
    private readonly instant: number;

    private constructor(params: IRegressionParams) {

        // console.log('building regression');

        this.valueRegressionsMultiplier = {};
        this.valueRegressionsCorrection = {};

        this.instant = Modifications.getInstance().getLastUpdate();

        const modificationsContact = Modifications.getInstance().findModificationsByType('CONTACT').map(m => m as ModificationContact);

        /**
         * multipliers
         */
        Demographics.getInstance().getCategories().forEach(category => {

            const valueRegression = new ValueRegressionMultiplier({
                contactCategory: category.getName(),
                modificationCount: params.modificationCount
            });
            valueRegression.setup(modificationsContact);
            this.valueRegressionsMultiplier[category.getName()] = valueRegression;

        });

        /**
         * corrections
         */
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

            const valueRegression = new ValueRegressionCorrection({
                ageGroupIndex: ageGroup.getIndex(),
                modificationCount: params.modificationCount
            });
            valueRegression.setup(modificationsContact);
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
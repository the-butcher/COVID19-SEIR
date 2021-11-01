import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ModificationResolverContact } from './../../common/modification/ModificationResolverContact';
import { ValueRegressionCorrection } from './ValueRegressionCorrection';
import { ValueRegressionMultiplier } from './ValueRegressionMultiplier';

export interface IRegressionParams {
    instant: number
    modificationCount: number;
}

export interface IRegressionResult {
    regression: number;
    original?: number;
}

export class Regression {

    static getInstance(instant?: number): Regression {

        if (instant) {
            this.instance = new Regression({
                instant,
                modificationCount: 20
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
        this.instant = params.instant;

        this.valueRegressionsMultiplier = {};
        this.valueRegressionsCorrection = {};

        // let modificationsContactA = new ModificationResolverContact().getModifications().filter(m => m.getInstant() < this.instant);
        // let modificationsContact0 = new ModificationResolverContact().getModifications().find(m => m.getInstant() === this.instant);
        // let modificationsContactB = new ModificationResolverContact().getModifications().filter(m => m.getInstant() > this.instant);

        // // console.log('mods a, b', modificationsContactA.length, modificationsContactB.length, Math.max(0, modificationsContactA.length - params.modificationCount / 2), Math.min(params.modificationCount / 2, modificationsContactB.length - 1));

        // modificationsContactA = modificationsContactA.slice(Math.max(0, modificationsContactA.length - params.modificationCount / 2));
        // modificationsContactB = modificationsContactB.slice(0, Math.min(params.modificationCount / 2, modificationsContactB.length - 1));

        // const modificationsContact: ModificationContact[] = [...modificationsContactA, modificationsContact0, ...modificationsContactB];

        const modificationsContact: ModificationContact[] = new ModificationResolverContact().getModifications();

        /**
         * multipliers
         */
        Demographics.getInstance().getCategories().forEach(category => {

            const valueRegression = new ValueRegressionMultiplier({
                instant: this.instant,
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
                instant: this.instant,
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
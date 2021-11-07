import { Demographics } from './../demographics/Demographics';
import { StrainUtil } from './../../util/StrainUtil';
import { IRegressionResult, Regression } from '../../model/regression/Regression';
import { TimeUtil } from './../../util/TimeUtil';
import { AModification } from './AModification';
import { IModificationValuesRegression } from './IModificationValuesRegression';
import { ModificationResolverContact } from './ModificationResolverContact';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ModificationRegression extends AModification<IModificationValuesRegression> {

    private regression: Regression;

    constructor(modificationParams: IModificationValuesRegression) {
        super('INSTANT', modificationParams);
        this.normalize();
    }

    normalize(): void {
        const multiplier_randoms: { [K in string]: number} = {};
        const correction_randoms: { [K in string]: number} = {};
        Demographics.getInstance().getCategories().forEach(category => {
            multiplier_randoms[category.getName()] = 0;
        });
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            correction_randoms[ageGroup.getIndex()] = 0;
        });
        this.acceptUpdate({
            multiplier_randoms,
            correction_randoms
        });
    }

    randomize(): void {
        const multiplier_randoms: { [K in string]: number} = {};
        const correction_randoms: { [K in string]: number} = {};
        Demographics.getInstance().getCategories().forEach(category => {
            multiplier_randoms[category.getName()] = StrainUtil.randomGaussian(StrainUtil.RANDOM_SCALE_095);
        });
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            correction_randoms[ageGroup.getIndex()] = StrainUtil.randomGaussian(StrainUtil.RANDOM_SCALE_095);
        });
        this.acceptUpdate({
            multiplier_randoms,
            correction_randoms
        });
    }

    getBackDays(): number {
        return this.modificationValues.back_days;
    }

    getPolyWeight(): number {
        return this.modificationValues.poly_days; // TODO rename property
    }

    /**
     * get a multiplier randomized in a way that fits the confidence interval associated with this multiplier
     * @param instant
     * @param contactCategory
     * @returns
     */
    getMultiplier(instant: number, contactCategory: string): IRegressionResult {
        const result = this.regression.getMultiplier(instant, contactCategory);
        return {
            ...result,
            regression: result.regression + result.ci95Dim * this.modificationValues.multiplier_randoms[contactCategory]
        }
    }

    /**
     * get a correction randomized in a way that fits the confidence interval associated with this correction
     * @param instant
     * @param ageGroupIndex
     * @returns
     */
     getCorrection(instant: number, ageGroupIndex: number): IRegressionResult {
        const result = this.regression.getCorrection(instant, ageGroupIndex);
        return {
            ...result,
            regression: result.regression + result.ci95Dim * this.modificationValues.correction_randoms[ageGroupIndex]
        }
    }

    /**
     * internal regression needs to update when the instant changes
     */
    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
        this.updateRegression();
    }

    /**
     * internal regression needs to update when some value changes
     */
    acceptUpdate(update: Partial<IModificationValuesRegression>): void {
        super.acceptUpdate(update);
        this.updateRegression();
    }

    private updateRegression(): void {
        this.regression = new Regression({
            instant: this.getInstantA(),
            instantMods: this.getInstantA() - this.getBackDays() * TimeUtil.MILLISECONDS_PER____DAY,
            polyWeight: this.getPolyWeight(),
            modificationsContact:  new ModificationResolverContact().getModifications()
        });
    }


}
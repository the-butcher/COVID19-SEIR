import { ChartAgeGroup } from './../../client/chart/ChartAgeGroup';
import { TimeUtil } from './../../util/TimeUtil';
import { IRegressionResult } from '../../model/regression/IRegressionResult';
import { ValueRegressionCorrection } from '../../model/regression/ValueRegressionCorrection';
import { ValueRegressionMultiplier } from './../../model/regression/ValueRegressionMultiplier';
import { StrainUtil } from './../../util/StrainUtil';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IModificationValuesRegression, IRegressionConfig } from './IModificationValuesRegression';
import { ModificationResolverContact } from './ModificationResolverContact';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ModificationRegression extends AModification<IModificationValuesRegression> {

    private multiplierRegressions: { [K in string]: ValueRegressionMultiplier };
    private correctionRegressions: { [K in string]: ValueRegressionCorrection };

    constructor(modificationParams: IModificationValuesRegression) {
        super('INSTANT', modificationParams);
        this.multiplierRegressions = {};
        this.correctionRegressions = {};
        this.normalize();
    }

    normalize(): void {
        const multiplier_randoms: { [K in string]: number} = {};
        const correction_randoms: { [K in string]: number} = {};
        Demographics.getInstance().getCategories().forEach(category => {
            multiplier_randoms[category.getName()] = 0;
        });
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            correction_randoms[ageGroup.getName()] = 0;
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
            correction_randoms[ageGroup.getName()] = StrainUtil.randomGaussian(StrainUtil.RANDOM_SCALE_095);
        });
        this.acceptUpdate({
            multiplier_randoms,
            correction_randoms
        });

    }

    getMinInstant(): number {
        let minInstant: number = Number.MAX_VALUE;
        Demographics.getInstance().getCategories().forEach(category => {
            minInstant = Math.min(minInstant, this.getInstantA() + this.modificationValues.multiplier_configs[category.getName()].back_days_a * TimeUtil.MILLISECONDS_PER____DAY);
        });
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            minInstant = Math.min(minInstant, this.getInstantA() + this.modificationValues.correction_configs[ageGroup.getName()].back_days_a * TimeUtil.MILLISECONDS_PER____DAY);
        });
        return minInstant;
    }

    getMultiplierConfig(category: string): IRegressionConfig {
        return this.modificationValues.multiplier_configs[category];
    }

    getCorrectionConfig(ageGroupName: string): IRegressionConfig {
        return this.modificationValues.correction_configs[ageGroupName];
    }

    /**
     * get a multiplier randomized in a way that fits the confidence interval associated with this multiplier
     * @param instant
     * @param contactCategory
     * @returns
     */
    getMultiplierRegression(instant: number, contactCategory: string): IRegressionResult {

        const result = this.multiplierRegressions[contactCategory].getRegressionResult(instant);
        if (result.regression && result.ci95Dim) {
            let regression = result.regression + result.ci95Dim * this.modificationValues.multiplier_randoms[contactCategory]
            if (regression < 0) {
                regression = 0;
            }
            return {
                ...result,
                regression
            }
        } else {
            return result;
        }

    }

    /**
     * get a correction randomized in a way that fits the confidence interval associated with this correction
     * @param instant
     * @param ageGroupIndex
     * @returns
     */
     getCorrectionRegression(instant: number, ageGroupName: string): IRegressionResult {

        const result = this.correctionRegressions[ageGroupName].getRegressionResult(instant);
        if (result.regression && result.ci95Dim) {
            let regression = result.regression + result.ci95Dim * this.modificationValues.correction_randoms[ageGroupName];
            if (regression < 0) {
                regression = 0;
            }
            return {
                ...result,
                regression
            }
        } else {
            return result;
        }

    }

    /**
     * internal regression needs to update when the instant changes
     */
    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
        this.updateRegressions(this.modificationValues.multiplier_configs, this.modificationValues.correction_configs);
    }

    /**
     * internal regression needs to update when some value changes
     */
    acceptUpdate(update: Partial<IModificationValuesRegression>): void {
        this.updateRegressions({...update.multiplier_configs}, {...update.correction_configs});
        update.multiplier_configs = {...this.modificationValues.multiplier_configs, ...update.multiplier_configs};
        update.correction_configs = {...this.modificationValues.correction_configs, ...update.correction_configs};
        super.acceptUpdate(update);
    }

    private updateRegressions(multiplierConfigs: { [K in string]: IRegressionConfig}, correctionConfigs: { [K in string]: IRegressionConfig}): void {

        for (const key of Object.keys(multiplierConfigs)) {
            const regressionConfig = multiplierConfigs[key];
            if (!regressionConfig.poly_shares) {
                regressionConfig.poly_shares = [0.5, 0.75];
            }
            const instantA = this.getInstantA() + regressionConfig.back_days_a * TimeUtil.MILLISECONDS_PER____DAY;
            const instantB = this.getInstantA() + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
            this.multiplierRegressions[key] = new ValueRegressionMultiplier({
                contactCategory: key,
                instantA,
                instantB,
                polyShares: regressionConfig.poly_shares,
                modificationsContact: new ModificationResolverContact().getModifications().filter(m => m.getInstant() <= instantB)
            });
        }

        for (const key of Object.keys(correctionConfigs)) {
            const regressionConfig = correctionConfigs[key];
            if (!regressionConfig.poly_shares) {
                regressionConfig.poly_shares = [0.5, 0.75];
            }
            const ageGroupIndex = Demographics.getInstance().findAgeGroupByName(key).getIndex();
            const instantA = this.getInstantA() + regressionConfig.back_days_a * TimeUtil.MILLISECONDS_PER____DAY;
            const instantB = this.getInstantA() + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
            this.correctionRegressions[key] = new ValueRegressionCorrection({
                ageGroupIndex,
                instantA,
                instantB,
                polyShares: regressionConfig.poly_shares,
                modificationsContact: new ModificationResolverContact().getModifications().filter(m => m.getInstant() <= instantB)
            });
        }

        // ChartAgeGroup.getInstance().renderRegressionData();

    }


}
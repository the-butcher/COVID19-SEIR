import { ControlsRegression } from '../../client/controls/ControlsRegression';
import { ModelActions } from '../../client/gui/ModelActions';
import { ModelConstants } from '../../model/ModelConstants';
import { IRegressionResult } from '../../model/regression/IRegressionResult';
import { ValueRegressionCorrection } from '../../model/regression/ValueRegressionCorrection';
import { ValueRegressionCorrectionTotal } from '../../model/regression/ValueRegressionCorrectionTotal';
import { ValueRegressionVaccination } from '../../model/regression/ValueRegressionVaccination';
import { ValueRegressionMultiplier } from './../../model/regression/ValueRegressionMultiplier';
import { StrainUtil } from './../../util/StrainUtil';
import { TimeUtil } from './../../util/TimeUtil';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IModificationValuesRegression, IRegressionConfig } from './IModificationValuesRegression';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverVaccination } from './ModificationResolverVaccination';
import { ModificationVaccination } from './ModificationVaccination';



/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ModificationRegression extends AModification<IModificationValuesRegression> {

    static readonly VACC_KEYS = ['v1', 'v2', 'v3', 'v4'];

    private multiplierRegressions: { [K in string]: ValueRegressionMultiplier };
    private correctionRegressions: { [K in string]: ValueRegressionCorrection };
    private vaccinationRegressions: { [K in string]: { [K in string]: ValueRegressionVaccination } };

    private correctionRegressionsTotal: ValueRegressionCorrectionTotal;

    constructor(modificationParams: IModificationValuesRegression) {

        super('INSTANT', modificationParams);
        this.multiplierRegressions = {};
        this.correctionRegressions = {};
        this.vaccinationRegressions = {};
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.vaccinationRegressions[ageGroup.getName()] = {};
        });

        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            if (!this.modificationValues.vaccination_configs[ageGroup.getName()]) {
                this.modificationValues.vaccination_configs[ageGroup.getName()] = {};
            }
            ModificationRegression.VACC_KEYS.forEach(vaccKey => {
                if (!this.modificationValues.vaccination_configs[ageGroup.getName()][vaccKey]) {
                    this.modificationValues.vaccination_configs[ageGroup.getName()][vaccKey] = {
                        back_days_a: -35,
                        back_days_b: 0,
                        poly_shares: [0.0, 0.25]
                    }
                }
            });
        });

        this.correctionRegressionsTotal = new ValueRegressionCorrectionTotal({
            ageGroupIndex: Demographics.getInstance().getAgeGroupTotal().getIndex(),
            instantA: this.getInstantA() - 35 * TimeUtil.MILLISECONDS_PER____DAY,
            instantB: this.getInstantA(),
            instantC: this.getInstantA() + 35 * TimeUtil.MILLISECONDS_PER____DAY,
            polyShares: [0.25, 0.75],
            modifications: new ModificationResolverContact().getModifications()
        });

        this.normalize();

        // initial regression build
        this.updateRegressions(this.modificationValues.multiplier_configs, this.modificationValues.correction_configs, this.modificationValues.vaccination_configs);

    }

    normalize(): void {
        const multiplier_randoms: { [K in string]: number } = {};
        const correction_randoms: { [K in string]: number } = {};
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

        const multiplier_randoms: { [K in string]: number } = {};
        const correction_randoms: { [K in string]: number } = {};

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
            ModificationRegression.VACC_KEYS.forEach(vaccKey => {
                minInstant = Math.min(minInstant, this.getInstantA() + this.modificationValues.vaccination_configs[ageGroup.getName()][vaccKey].back_days_a * TimeUtil.MILLISECONDS_PER____DAY);
            });
        });
        return minInstant;
    }

    getMultiplierConfig(category: string): IRegressionConfig {
        return this.modificationValues.multiplier_configs[category];
    }

    getCorrectionConfig(ageGroupName: string): IRegressionConfig {
        return this.modificationValues.correction_configs[ageGroupName];
    }

    getVaccinationConfig(ageGroupName: string, vaccKey: string): IRegressionConfig {
        return this.modificationValues.vaccination_configs[ageGroupName][vaccKey];
    }

    /**
     * get a multiplier randomized in a way that fits the confidence interval associated with this multiplier
     *
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
     *
     * @param instant
     * @param ageGroupIndex
     * @returns
     */
    getCorrectionRegression(instant: number, ageGroupName: string): IRegressionResult {

        const result = this.correctionRegressions[ageGroupName]?.getRegressionResult(instant);
        if (!result && ageGroupName === ModelConstants.AGEGROUP_NAME_______ALL) {

            const resultTotal = this.correctionRegressionsTotal.getRegressionResult(instant);
            let regressionTotal = resultTotal.regression;
            return {
                ...resultTotal,
                regression: regressionTotal
            }
        }

        if (result && result.regression && result.ci95Dim) {
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

    getVaccinationRegression(instant: number, ageGroupName: string, vaccKey: string): IRegressionResult {
        return this.vaccinationRegressions[ageGroupName][vaccKey].getRegressionResult(instant);
    }

    /**
     * internal regression needs to update when the instant changes
     */
    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
        if (instantA !== this.getInstantA() || instantB !== this.getInstantB()) {
            // all regression need to rebuild when the instant changes (? verify)
            this.updateRegressions(this.modificationValues.multiplier_configs, this.modificationValues.correction_configs, this.modificationValues.vaccination_configs);
        }
    }

    /**
     * internal regression needs to update when some value changes
     */
    acceptUpdate(update: Partial<IModificationValuesRegression>): void {
        this.updateRegressions({ ...update.multiplier_configs }, { ...update.correction_configs }, { ...update.vaccination_configs });
        update.multiplier_configs = { ...this.modificationValues.multiplier_configs, ...update.multiplier_configs };
        update.correction_configs = { ...this.modificationValues.correction_configs, ...update.correction_configs };
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            if (update.vaccination_configs) {
                update.vaccination_configs[ageGroup.getName()] = { ...this.modificationValues.vaccination_configs[ageGroup.getName()], ...update.vaccination_configs[ageGroup.getName()] };
            }
        });
        update.vaccination_configs = { ...this.modificationValues.vaccination_configs, ...update.vaccination_configs };
        super.acceptUpdate(update);
    }

    private updateRegressions(multiplierConfigs: { [K in string]: IRegressionConfig }, correctionConfigs: { [K in string]: IRegressionConfig }, vaccinationConfigs: { [K in string]: { [K in string]: IRegressionConfig } }): void {

        for (const key of Object.keys(multiplierConfigs)) {
            // console.log('updating m-regression', key);
            const regressionConfig = multiplierConfigs[key];
            if (!regressionConfig.poly_shares) {
                regressionConfig.poly_shares = [0.5, 0.75];
            }
            const instantA = this.getInstantA() + regressionConfig.back_days_a * TimeUtil.MILLISECONDS_PER____DAY;
            const instantB = this.getInstantA(); // + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
            const instantC = this.getInstantA() + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
            this.multiplierRegressions[key] = new ValueRegressionMultiplier({
                contactCategory: key,
                instantA,
                instantB,
                instantC,
                polyShares: regressionConfig.poly_shares,
                modifications: new ModificationResolverContact().getModifications() // .filter(m => m.getInstant() <= instantB)
            });
        }

        for (const key of Object.keys(correctionConfigs)) {
            // console.log('updating c-regression', key);
            const regressionConfig = correctionConfigs[key];
            if (!regressionConfig.poly_shares) {
                regressionConfig.poly_shares = [0.5, 0.75];
            }
            const ageGroupIndex = Demographics.getInstance().findAgeGroupByName(key).getIndex();
            const instantA = this.getInstantA() + regressionConfig.back_days_a * TimeUtil.MILLISECONDS_PER____DAY;
            const instantB = this.getInstantA();
            const instantC = this.getInstantA() + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
            this.correctionRegressions[key] = new ValueRegressionCorrection({
                ageGroupIndex,
                instantA,
                instantB,
                instantC,
                polyShares: regressionConfig.poly_shares,
                modifications: new ModificationResolverContact().getModifications()
            });
        }


        for (const ageKey of Object.keys(vaccinationConfigs)) {
            for (const vaccKey of Object.keys(vaccinationConfigs[ageKey])) {
                // console.log('updating v-regression', ageKey, vaccKey);
                const regressionConfig = vaccinationConfigs[ageKey][vaccKey]; // by age group
                if (!regressionConfig.poly_shares) {
                    regressionConfig.poly_shares = [0.5, 0.75];
                }
                // const ageGroupIndex = Demographics.getInstance().findAgeGroupByName(ageKey).getIndex();
                const instantA = this.getInstantA() + regressionConfig.back_days_a * TimeUtil.MILLISECONDS_PER____DAY;
                const instantB = this.getInstantA(); // + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
                const instantC = this.getInstantA() + regressionConfig.back_days_b * TimeUtil.MILLISECONDS_PER____DAY;
                this.vaccinationRegressions[ageKey][vaccKey] = new ValueRegressionVaccination({
                    ageGroupName: ageKey,
                    vaccinationPropertyGetter: (m: ModificationVaccination) => {
                        return m.getModificationValues().vaccinations[ageKey][vaccKey] || 0;
                    },
                    instantA,
                    instantB,
                    instantC,
                    polyShares: regressionConfig.poly_shares,
                    modifications: new ModificationResolverVaccination().getModifications() // .filter(m => m.getInstantA() <= instantB)
                });
            };
        }

    }


}
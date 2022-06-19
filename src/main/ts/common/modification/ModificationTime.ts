import { BaseData } from '../../model/basedata/BaseData';
import { CompartmentChainReproduction } from '../../model/compartment/CompartmentChainReproduction';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { ObjectUtil } from '../../util/ObjectUtil';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { IVaccinationConfig } from '../demographics/IVaccinationConfig';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IContactCategories } from './IContactCategories';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationContact } from './ModificationContact';
import { ModificationDiscovery } from './ModificationDiscovery';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverDiscovery } from './ModificationResolverDiscovery';
import { ModificationResolverSeasonality } from './ModificationResolverSeasonality';
import { ModificationResolverVaccination } from './ModificationResolverVaccination';
import { Modifications } from './Modifications';
import { ModificationSeasonality } from './ModificationSeasonality';
import { ModificationSettings } from './ModificationSettings';
import { ModificationVaccination } from './ModificationVaccination';

export interface IRatios {
    contact: number;
    setting: number;
    discovery: number;
}

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationTime extends AModification<IModificationValuesTime> implements IContactMatrix, IContactCategories {

    static createInstance(instant: number): ModificationTime {
        const id = ObjectUtil.createId();
        const modificationTime = new ModificationTime({
            id,
            key: 'TIME',
            instant: instant,
            name: id,
            deletable: false,
            draggable: false
        });
        modificationTime.setInstants(instant, instant);
        return modificationTime;
    }

    // private modificationVaccination0: ModificationVaccination;

    private modificationContact: ModificationContact;
    private modificationDiscovery: ModificationDiscovery;
    private modificationVaccination: ModificationVaccination;
    private modificationSeasonality: ModificationSeasonality;
    private modificationSettings: ModificationSettings;

    private maxCellValue: number;
    private maxColumnValue: number;
    private valueSum: number;
    private columnValues: number[];
    private cellValues: number[][];
    private discoveryRatesByAgeGroup: IRatios[];
    private quarantineMultipliersByAgeGroup: number[];

    // private discoveryRateOverall: number;
    // private positivityRateInjected: number;

    private readonly ageGroups: AgeGroup[];
    private readonly ageGroupIndexTotal: number;
    private readonly contactCategories: ContactCategory[];
    private readonly absTotal: number;

    // private readonly ageGroupFactors: number[] = [];

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
        this.ageGroups = [...Demographics.getInstance().getAgeGroups()];
        this.ageGroupIndexTotal = Demographics.getInstance().getAgeGroupTotal().getIndex();
        this.contactCategories = [...Demographics.getInstance().getCategories()];
        this.absTotal = Demographics.getInstance().getAbsTotal();
        this.resetValues();
    }

    getCategories(): ContactCategory[] {
        return this.contactCategories;
    }

    acceptUpdate(update: Partial<IModificationValuesTime>): void {
        super.acceptUpdate(update); // title is updateable
    }

    /**
     * TODO there should be a test for this
     * must be instant A (the underlying contact modification may have a different time, while still applying to this instance)
     * @returns
     */
    getInstant(): number {
        return this.getInstantA();
    }

    /**
     * no model update required
     * @param instantA
     * @param instantB
     */
    setInstants(instantA: number, instantB: number): void {

        super.setInstants(instantA, instantB);
        this.modificationContact = new ModificationResolverContact().getModification(this.getInstantA(), 'INTERPOLATE');
        this.modificationDiscovery = new ModificationResolverDiscovery().getModification(this.getInstantA(), 'INTERPOLATE');

        // vaccinations for this instant / for a day previous
        const modificationResolverVaccination = new ModificationResolverVaccination();
        this.modificationVaccination = modificationResolverVaccination.getModification(this.getInstantA(), 'INTERPOLATE');

        this.modificationSeasonality = new ModificationResolverSeasonality().getModification(this.getInstantA(), 'INTERPOLATE');
        this.modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;
        this.resetValues();

    }

    getVaccinationConfig2(ageGroup: string): IVaccinationConfig {
        return this.modificationVaccination.getVaccinationConfig(ageGroup);
    }

    getReexposure(): number {
        return this.modificationSettings.getReexposure();
    }

    resetValues(): void {

        this.maxCellValue = -1;
        this.maxColumnValue = -1;
        this.valueSum = -1;
        this.columnValues = [];
        this.discoveryRatesByAgeGroup = undefined;
        this.quarantineMultipliersByAgeGroup = undefined;
        this.cellValues = [];
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }

    }

    getSeasonality(category: string): number {
        return this.modificationSeasonality.getSeasonality(category);
    }

    getDiscoveryRatesRaw(ageGroupIndex: number): IRatios {
        if (!this.discoveryRatesByAgeGroup) {
            this.buildRates();
        }
        return this.discoveryRatesByAgeGroup[ageGroupIndex];
    }

    getCorrectionValue(ageGroupIndex: number): number {
        return this.modificationDiscovery.getCorrectionValue(ageGroupIndex);
    }

    private buildRates(): void {

        this.discoveryRatesByAgeGroup = [];
        this.quarantineMultipliersByAgeGroup = [];

        const shareOfInfectionBeforeIncubation = CompartmentChainReproduction.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;

        // have a base set of values
        let discoveryRates: number[] = [
            1.00, // <= 04
            1.00, // 05-14
            1.00, // 15-24
            1.00, // 25-34
            1.00, // 35-44
            1.00, // 45-54
            1.00, // 55-64
            1.00, // 65-74
            1.00, // 75-84
            1.00, // >= 85
        ].map(v => v);

        // fill with configuration values
        this.ageGroups.forEach(ageGroup => {
            discoveryRates[ageGroup.getIndex()] = this.modificationDiscovery.getCorrectionValue(ageGroup.getIndex());
        });

        /**
         * just collect from the settings
         */
        this.ageGroups.forEach(ageGroup => {

            const ageGroupIndex = ageGroup.getIndex();

            this.discoveryRatesByAgeGroup[ageGroupIndex] = {
                setting: discoveryRates[ageGroup.getIndex()],
                contact: 1, // contactTotal,
                discovery: discoveryRates[ageGroup.getIndex()], // discoveryRateAgeGroup / contactTotal
            };

        });

        /**
         * if configured discovery rates were weights, could the assumption be made that an overall discovery rate could be composed of:
         * - config value would be the rate of people in an age group actually getting tested (let it be a test rate multiplier)
         * - effectively this would define a test-rate weight per age-group
         * - then, depending on actual cases in the respective age group specific age-group positivity-rates could be calculated
         * - finally from each group would get it's discovery rate and the overall discovery would just be derived from those values
         */
        const normalize2 = () => {

            // the discovery weights by age group as configured
            let ageGroupDiscoveryWeights: number[] = [];
            this.ageGroups.forEach(ageGroup => {
                ageGroupDiscoveryWeights.push(this.getCorrectionValue(ageGroup.getIndex()) * ageGroup.getAbsValue());
            });
            const totalDiscoveryWeight = ageGroupDiscoveryWeights.reduce((a, b) => a + b, 0);

            let ageGroupShares: number[] = [];
            this.ageGroups.forEach(ageGroup => {
                ageGroupShares.push(ageGroupDiscoveryWeights[ageGroup.getIndex()] / totalDiscoveryWeight);
            });

            const totalTestsPerDay = this.getTestRate() * Demographics.getInstance().getAbsTotal();
            const totalPositivityRate = this.getPositivityRate();
            const totalDiscoveryRate = StrainUtil.calculateDiscoveryRate(totalPositivityRate, this.getTestRate(), ModificationSettings.getInstance().getModificationValues());
            const totalDiscovery = totalDiscoveryRate * Demographics.getInstance().getAbsTotal();

            // const ageGroupTestRates: number[] = [];
            // const ageGroupDiscoveryRates: number[] = [];

            // let ageGroupTestSum: number = 0;
            // let ageGroupDiscoverySum: number = 0;

            this.ageGroups.forEach(ageGroup => {


                // calculate a new discovery rate from weights
                const ageGroupDiscoveryRate = totalDiscovery * ageGroupShares[ageGroup.getIndex()] / ageGroup.getAbsValue();

                // const ageGroupTestRate = ageGroupShares[ageGroup.getIndex()] * totalTestsPerDay / ageGroup.getAbsValue();
                // const ageGroupPositivity = totalPositivityRate; // ??? ageGroupShares[ageGroup.getIndex()] = totalPositivityRate / ageGroupShares[ageGroup.getIndex()];
                // const ageGroupDiscovery = StrainUtil.calculateDiscoveryRate(ageGroupPositivity, ageGroupTestRate, ModificationSettings.getInstance().getModificationValues());

                // ageGroupTestSum += ageGroupShares[ageGroup.getIndex()] * totalTestsPerDay;
                // ageGroupDiscoverySum += ageGroupDiscoveryRate * ageGroup.getAbsValue();

                // ageGroupDiscoveryRates.push(ageGroupDiscovery);
                // ageGroupTestRates.push(ageGroupTestRate);

                let contact = this.discoveryRatesByAgeGroup[ageGroup.getIndex()].contact; // * correction;
                this.discoveryRatesByAgeGroup[ageGroup.getIndex()] = {
                    setting: this.discoveryRatesByAgeGroup[ageGroup.getIndex()].setting,
                    contact,
                    discovery: ageGroupDiscoveryRate
                };
                // how many tests would it have taken to produce this discovery rate? <-- this in a way that the total number of tests matches

            });

            // console.log(TimeUtil.formatCategoryDateFull(this.getInstant()), totalDiscovery, ageGroupDiscoverySum);


        }


        normalize2();

        /**
         * calculate quarantine multipliers, depending on contact
         */
        this.ageGroups.forEach(ageGroup => {
            const ageGroupIndex = ageGroup.getIndex();
            let discovery = this.discoveryRatesByAgeGroup[ageGroupIndex].discovery;
            this.quarantineMultipliersByAgeGroup[ageGroupIndex] = shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - discovery * this.modificationSettings.getQuarantine(ageGroupIndex));
        });

        this.discoveryRatesByAgeGroup[this.ageGroupIndexTotal] = {
            setting: -1,
            contact: -1,
            discovery: this.calculateDiscoveryRateOverall()
        }

    }

    injectPositivityRate(positivityRate: number): void {
        // console.log('injecting to', this.modificationDiscovery.getId(), this.modificationDiscovery.getName());
        this.modificationDiscovery.acceptUpdate({
            positivityRate
        });
    }

    /**
     * TODO DISCOVERY :: with varying strains maybe "overall" is a term that can not be calculated any more
     * but how would a smoothed discovery curve be calculated without first knowing discovery rates throughout time?
     *
     * assume:
     *
     * 80% delta   --> high DiscoveryProfile as of DiscoveryValueSet (which describes a discovery distribution through age groups)
     * 20% omicron --> low  DiscoveryProfile as of DiscoveryValueSet (which describes a discovery distribution through age groups)
     *
     *
     *
     * when integrating the model, the discovery distributions could be calculated and normalized in a pre-processing step (how, where?),
     * so total positivity would be correct again
     *
     * @returns
     */
    private calculateDiscoveryRateOverall(): number {
        const testRate = this.getTestRate();
        const positivityRate = this.getPositivityRate();
        if (testRate && positivityRate) {
            return StrainUtil.calculateDiscoveryRate(positivityRate, testRate, ModificationSettings.getInstance().getModificationValues());
        } else {
            // Math.random();
        }
    }

    getPositivityRate(): number {
        return this.modificationDiscovery.getPositivityRate();
    }

    getTestRate(): number {
        return this.modificationDiscovery.getTestRate();
    }

    getQuarantineMultiplier(ageGroupIndex: number): number {
        if (!this.quarantineMultipliersByAgeGroup) {
            this.buildRates();
        }
        return this.quarantineMultipliersByAgeGroup[ageGroupIndex];
    }

    getCellValue(indexContact: number, indexParticipant: number): number {

        if (!this.cellValues[indexContact]) {
            this.cellValues[indexContact] = [];
        }

        if (!this.cellValues[indexContact][indexParticipant]) {

            // specific quarantine reduction for this combination of age groups (TODO :: precalculate to save some time)
            const multiplierQuarantine = this.getQuarantineMultiplier(indexContact) * this.getQuarantineMultiplier(indexParticipant);

            // combined correction multiplier for the combination of these age groups
            const multiplierCorrection = this.modificationContact.getCorrectionValue(indexContact) * this.modificationContact.getCorrectionValue(indexParticipant);

            let contactValue = 0;
            this.contactCategories.forEach(contactCategory => {

                // specific seasonal reduction for this category
                const multiplierSeasonality = this.modificationSeasonality.getSeasonality(contactCategory.getName());
                contactValue += contactCategory.getCellValue(indexContact, indexParticipant) * this.modificationContact.getCategoryValue(contactCategory.getName()) * multiplierSeasonality;

            });

            this.cellValues[indexContact][indexParticipant] = contactValue * multiplierQuarantine * multiplierCorrection;

        }

        return this.cellValues[indexContact][indexParticipant];

    }

    getColumnValueSummary(ageGroupContact: AgeGroup): { [K in string]: number } {

        const indexContact = ageGroupContact.getIndex();

        const summary: { [K: string]: number } = {};
        let contactTotal = 0;
        let contactValue: number;

        this.contactCategories.forEach(category => {

            // specific seasonal reduction for this category
            const multiplierSeasonality = this.modificationSeasonality.getSeasonality(category.getName());

            let contactCategory = 0;
            this.ageGroups.forEach(ageGroupParticipant => {

                const indexParticipant = ageGroupParticipant.getIndex();

                // specific quarantine reduction for this combination of age groups (TODO :: precalculate to save some time)
                const multiplierQuarantine = this.getQuarantineMultiplier(indexContact) * this.getQuarantineMultiplier(indexParticipant);

                // combined correction multiplier for the combination of these age groups
                const multiplierCorrection = this.modificationContact.getCorrectionValue(indexContact) * this.modificationContact.getCorrectionValue(indexParticipant);

                contactValue = category.getCellValue(indexContact, indexParticipant) * this.modificationContact.getCategoryValue(category.getName()) * multiplierQuarantine * multiplierCorrection;
                contactCategory += contactValue;

            });
            // console.log(contactCategory.getName(), 'TOTAL', sum);
            summary[category.getName()] = contactCategory * multiplierSeasonality;
            contactTotal += contactCategory;

        });
        summary['total'] = contactTotal;
        // console.log('TOTAL', summary);
        return summary;

    }

    getMaxCellValue(): number {
        if (this.maxCellValue < 0) {
            this.maxCellValue = ContactCellsUtil.findMaxCellValue(this);
        }
        return this.maxCellValue;
    }

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    getMaxColumnValue(): number {
        if (this.maxColumnValue < 0) {
            this.maxColumnValue = ContactCellsUtil.findMaxColumnValue(this);
        }
        return this.maxColumnValue;
    }

    getColumnSum(): number {
        return this.getMatrixSum();
    }

    getMaxColumnSum(): number {
        return this.getMaxMatrixSum();
    }

    getCellSum(): number {
        return this.getMatrixSum();
    }

    getMatrixSum(): number {
        if (this.valueSum < 0) {
            this.valueSum = ContactCellsUtil.findMatrixValue(this);
        }
        return this.valueSum;
    }

    getMaxMatrixSum(): number {
        return this.getMatrixSum();
    }

}
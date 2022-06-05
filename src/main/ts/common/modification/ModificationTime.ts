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

    /**
     * // TODO DISCOVERY :: deprecate, then remove
     * @param ageGroupIndex
     * @returns
     */
    getDiscoveryRateLoess(ageGroupIndex: number): number {
        return ModificationResolverDiscovery.getRegression(ageGroupIndex).findLoessValue(this.getInstant()).y;
    }

    private buildRates(): void {

        this.discoveryRatesByAgeGroup = [];
        this.quarantineMultipliersByAgeGroup = [];

        const shareOfInfectionBeforeIncubation = CompartmentChainReproduction.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;

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

        const ageGroupFactors: number[] = [];

        this.ageGroups.forEach(ageGroup => {

            discoveryRates[ageGroup.getIndex()] = this.modificationDiscovery.getCorrectionValue(ageGroup.getIndex());

            // 0 (<= 04) to 1 (>= 85)
            const ageGroupIndex = ageGroup.getIndex();
            const ageGroupFraction = ((ageGroupIndex / (this.ageGroups.length - 1)) - 0.35) * 1.8;

            const xp9sqp = Math.sin(Math.pow(ageGroupFraction, 3)) * this.modificationDiscovery.getFactorWeight();
            ageGroupFactors.push(xp9sqp);

            // const xp9sqp = Math.cos(Math.pow(ageGroupFraction * Math.PI, 3) / Math.pow(Math.PI, 2)) * -0.50 + 0.50;
            // const discoveryFactorAge = Math.max(0, Math.min(1, xp9sqp));
            // ageGroupFactors.push(discoveryFactorAge);

        });
        // console.log(TimeUtil.formatCategoryDateFull(this.getInstant()), ageGroupFactors);

        /**
         * just collect from the settings
         */
        this.ageGroups.forEach(ageGroup => {

            const ageGroupIndex = ageGroup.getIndex();
            let contactTotal = 0;
            let discoveryRateAgeGroup = 0;

            this.contactCategories.forEach(contactCategory => {

                // current contact ratio for that contact category as set in modification (0% to 100%)
                const contactRatioCategory = this.modificationContact.getCategoryValue(contactCategory.getName());
                // total contact in the requested age group in contact category (TODO - question this value)
                const contactGroupCategory = contactCategory.getColumnValue(ageGroupIndex);
                // current total contact as of base contact-rate and contact-ratio in contact category
                const contactTotalCategory = contactRatioCategory * contactGroupCategory;

                // current discovery setting for category as set in modification
                let discoveryRateCategory = discoveryRates[ageGroup.getIndex()];

                // current share of discovered in currentTotal
                contactTotal += contactTotalCategory;
                discoveryRateAgeGroup += discoveryRateCategory * contactTotalCategory;

            });

            this.discoveryRatesByAgeGroup[ageGroupIndex] = {
                contact: contactTotal,
                discovery: discoveryRateAgeGroup / contactTotal
            };

        });


        // if (this.getInstant() % TimeUtil.MILLISECONDS_PER____DAY === 0) {
        //     this.ageGroups.forEach(ageGroup => {
        //         console.log(TimeUtil.formatCategoryDateFull(this.getInstant()), ageGroup.getIndex(), ageGroup.getName(), this.discoveryRatesByAgeGroup[ageGroup.getIndex()].discovery, this.discoveryRatesByAgeGroup[ageGroup.getIndex()].contact);
        //     });
        // }

        const normalize = () => {

            let _discoveryRateOverall = 0;
            this.ageGroups.forEach(ageGroup => {
                _discoveryRateOverall += ageGroup.getAbsValue() * this.discoveryRatesByAgeGroup[ageGroup.getIndex()].discovery;
            });
            _discoveryRateOverall = _discoveryRateOverall / this.absTotal;

            const correction = this.calculateDiscoveryRateOverall() / _discoveryRateOverall;
            this.ageGroups.forEach(ageGroup => {

                const ageGroupIndex = ageGroup.getIndex();

                let contact = this.discoveryRatesByAgeGroup[ageGroupIndex].contact * correction;
                let discovery = Math.min(1, this.discoveryRatesByAgeGroup[ageGroupIndex].discovery * correction);
                this.discoveryRatesByAgeGroup[ageGroup.getIndex()] = {
                    contact,
                    discovery
                };

            });

        }

        normalize();



        this.ageGroups.forEach(ageGroup => {

            const ageGroupIndex = ageGroup.getIndex();

            // 0 (<= 04) to 1 (>= 85)
            let discovery = this.discoveryRatesByAgeGroup[ageGroupIndex].discovery;
            discovery += (1 - discovery) * ageGroupFactors[ageGroupIndex];

            this.discoveryRatesByAgeGroup[ageGroup.getIndex()] = {
                ...this.discoveryRatesByAgeGroup[ageGroup.getIndex()],
                discovery
            };

        });

        normalize();

        /**
         * calculate quarantine multipliers, depending on contact
         */
        this.ageGroups.forEach(ageGroup => {
            const ageGroupIndex = ageGroup.getIndex();
            let discovery = this.discoveryRatesByAgeGroup[ageGroupIndex].discovery;
            this.quarantineMultipliersByAgeGroup[ageGroupIndex] = shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - discovery * this.modificationSettings.getQuarantine(ageGroupIndex));
        });

        this.discoveryRatesByAgeGroup[this.ageGroupIndexTotal] = {
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
            Math.random();
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
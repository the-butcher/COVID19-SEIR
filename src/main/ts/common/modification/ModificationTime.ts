import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
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
    private ratiosByAgeGroup: IRatios[];

    private readonly ageGroups: AgeGroup[];
    private readonly contactCategories: ContactCategory[];
    private readonly absTotal: number;

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
        this.ageGroups = [...Demographics.getInstance().getAgeGroups()];
        this.contactCategories = [...Demographics.getInstance().getCategories()];
        this.absTotal = Demographics.getInstance().getAbsTotal();
        this.resetValues();
    }

    getCategories(): ContactCategory[] {
        return this.contactCategories;
    }

    logSummary(): void {
        // do nothing
    }

    acceptUpdate(update: Partial<IModificationValuesTime>): void {
        // nothing to be updated
    }

    getLut1ByName(ageGroup: string): { [K in number]: number} {
        return this.modificationVaccination.getLut1ByName(ageGroup);
    }

    getLut2ByName(ageGroup: string): { [K in number]: number} {
        return this.modificationVaccination.getLut2ByName(ageGroup);
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
        this.modificationContact = new ModificationResolverContact().getModification(this.getInstantA());
        this.modificationDiscovery = new ModificationResolverDiscovery().getModification(this.getInstantA());
        this.modificationVaccination = Modifications.getInstance().findModificationsByType('VACCINATION')[0] as ModificationVaccination; // not mutable, thus reusable
        this.modificationSeasonality = new ModificationResolverSeasonality().getModification(this.getInstantA());
        this.modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;
        this.resetValues();

    }

    resetValues(): void {

        this.maxCellValue = -1;
        this.maxColumnValue = -1;
        this.valueSum = -1;
        this.columnValues = [];
        this.ratiosByAgeGroup = [];
        this.cellValues = [];

        for (let indexContact = 0; indexContact < Demographics.getInstance().getAgeGroups().length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }

    }

    getSeasonality(): number {
        return this.modificationSeasonality.getSeasonality();
    }

    getRatios(ageGroupIndex: number): IRatios {

        if (!this.ratiosByAgeGroup[ageGroupIndex]) {

            let contactTotal = 0;
            let discoveryTotal = 0;
            this.contactCategories.forEach(contactCategory => {

                // current contact ratio for contact category
                const contactRatioCategory = this.modificationContact.getCategoryValue(contactCategory.getName());
                // total contact in the requested age group in contact category
                const contactGroupCategory = contactCategory.getColumnValue(ageGroupIndex);
                // current total contact as of base contact-rate and contact-ratio in contact category
                const contactTotalCategory = contactRatioCategory * contactGroupCategory;

                // current discovery ratio for category
                const discoveryRatioCategory = this.modificationDiscovery.getCategoryValue(contactCategory.getName());

                // current share of discovered in currentTotal
                contactTotal += contactTotalCategory;
                discoveryTotal += discoveryRatioCategory * contactTotalCategory;

            });

            this.ratiosByAgeGroup[ageGroupIndex] = {
                contact: contactTotal,
                discovery: discoveryTotal / contactTotal
            };

        }

        return this.ratiosByAgeGroup[ageGroupIndex];

    }

    getDiscoveryRatioTotal(): number {
        let discoveryTotal = 0;
        this.ageGroups.forEach(ageGroup => {
            discoveryTotal += ageGroup.getAbsValue() * this.getRatios(ageGroup.getIndex()).discovery;
        });
        return discoveryTotal / this.absTotal;
    }

    getQuarantineMultiplier(ageGroupIndex: number): number {
        const shareOfInfectionBeforeIncubation = CompartmentChain.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;
        return shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - this.getRatios(ageGroupIndex).discovery * this.modificationSettings.getQuarantine(ageGroupIndex));
    }

    getCellValue(indexContact: number, indexParticipant: number): number {

        if (!this.cellValues[indexContact]) {
            this.cellValues[indexContact] = [];
        }

        if (!this.cellValues[indexContact][indexParticipant]) {

            /**
             * reduction through seasonality
             */
            const multiplierSeasonality = this.modificationSeasonality.getSeasonality();

            /**
             * reduction through quarantine
             */
            const multiplierQuarantine = this.getQuarantineMultiplier(indexContact) * this.getQuarantineMultiplier(indexParticipant);

            /**
             * contact value for this age group (category reductions get considered in ModificationContact)
             */
            const contactValue = this.modificationContact.getCellValue(indexContact, indexParticipant);

            this.cellValues[indexContact][indexParticipant] = contactValue * multiplierQuarantine *  multiplierSeasonality;

        }

        return this.cellValues[indexContact][indexParticipant];



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
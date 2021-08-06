import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationContact } from './ModificationContact';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverSeasonality } from './ModificationResolverSeasonality';
import { ModificationResolverTesting } from './ModificationResolverTesting';
import { Modifications } from './Modifications';
import { ModificationSeasonality } from './ModificationSeasonality';
import { ModificationSettings } from './ModificationSettings';
import { ModificationTesting } from './ModificationTesting';
import { ModificationVaccination } from './ModificationVaccination';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationTime extends AModification<IModificationValuesTime> implements IContactMatrix {

    private modificationContact: ModificationContact;
    private modificationTesting: ModificationTesting;
    private modificationVaccination: ModificationVaccination;
    private modificationSeasonality: ModificationSeasonality;
    private modificationSettings: ModificationSettings;

    private maxCellValue: number;
    private maxColumnValue: number;
    private valueSum: number;
    private columnValues: number[];

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
        this.resetValues();
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
        this.modificationTesting = new ModificationResolverTesting().getModification(this.getInstantA());
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
        for (let indexContact = 0; indexContact < Demographics.getInstance().getAgeGroups().length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }
    }

    getSeasonality(): number {
        return this.modificationSeasonality.getSeasonality();
    }

    getTestingRatio(ageGroupIndex: number): number {
        return this.modificationTesting.getColumnValue(ageGroupIndex);
    }

    getCellValue(indexContact: number, indexParticipant: number): number {

        /**
         * reduction through people isolating after a positive test
         */
        const multiplierTesting = this.getContactMultiplier(indexContact) * this.getContactMultiplier(indexParticipant);

        /**
         * reduction through seasonality
         */
        const multiplierSeasonality = this.modificationSeasonality.getSeasonality();

        return this.getContactValue(indexContact, indexParticipant) * multiplierTesting *  multiplierSeasonality;

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

    getCellSum(): number {
        return this.getMatrixSum();
    }

    getColumnSum(): number {
        return this.getMatrixSum();
    }

    getMatrixSum(): number {
        if (this.valueSum < 0) {
            this.valueSum = ContactCellsUtil.findMatrixValue(this);
        }
        return this.valueSum;
    }

    getMaxColumnSum(): number {
        return this.getMaxMatrixSum();
    }

    getMaxMatrixSum(): number {
        return this.getMatrixSum();
    }

    getContactValue(indexContact: number, indexParticipant: number): number {
        return this.modificationContact.getCellValue(indexContact, indexParticipant);
    }

    getContactMultiplier(ageGroupIndex: number): number {
        const shareOfInfectionBeforeIncubation = CompartmentChain.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;
        return shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - this.getTestingRatio(ageGroupIndex) * this.modificationSettings.getQuarantine());
    }

}
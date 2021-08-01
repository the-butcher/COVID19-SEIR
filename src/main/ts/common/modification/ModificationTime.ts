import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { AModification } from './AModification';
import { IContactCells } from './IContactCells';
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
export class ModificationTime extends AModification<IModificationValuesTime> implements IContactCells {

    private modificationContact: ModificationContact;
    private modificationTesting: ModificationTesting;
    private modificationVaccination: ModificationVaccination;
    private modificationSeasonality: ModificationSeasonality;
    private modificationSettings: ModificationSettings;

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
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

    getContactValue(indexContact: number, indexParticipant: number): number {
        return this.modificationContact.getCellValue(indexContact, indexParticipant);
    }

    getContactMultiplier(ageGroupIndex: number): number {
        const shareOfInfectionBeforeIncubation = CompartmentChain.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;
        return shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - this.getTestingRatio(ageGroupIndex) * this.modificationSettings.getQuarantine());
    }

}
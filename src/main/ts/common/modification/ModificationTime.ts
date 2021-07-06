import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { AModification } from './AModification';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationContact } from './ModificationContact';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverSeasonality } from './ModificationResolverSeasonality';
import { ModificationResolverSettings } from './ModificationResolverSettings';
import { ModificationResolverTesting } from './ModificationResolverTesting';
import { ModificationResolverVaccination } from './ModificationResolverVaccination';
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

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
    }

    acceptUpdate(update: Partial<IModificationValuesTime>): void {
        // nothing to be updated
    }

    getLutByName(ageGroup: string): { [K in number]: number} {
        return this.modificationVaccination.getLutByName(ageGroup);
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

    getMaxColTotal(): number {
        return this.modificationContact.getMaxColTotal();
    }

    getMaxCellTotal(): number {
        return this.modificationContact.getMaxCellTotal();
    }

    getSeasonality(): number {
        return this.modificationSeasonality.getSeasonality();
    }

    getTestingRatio(ageGroupIndex: number): number {
        return this.modificationTesting.getTestingRatio(ageGroupIndex);
    }

    getContacts(indexContact: number, indexParticipant: number): number {

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

    getSummary(indexContact: number, indexParticipant: number): {[K: string]: string} {
        return {
            'time': this.getContacts(indexContact, indexParticipant).toFixed(4)
        };
    }

    /**
     * get the underlying contact matrix setting
     * @param indexContact
     * @param indexParticipant
     * @returns
     */
    getContactValue(indexContact: number, indexParticipant: number): number {
        return this.modificationContact.getContacts(indexContact, indexParticipant);
    }

    getContactMultiplier(ageGroupIndex: number): number {
        const shareOfInfectionBeforeIncubation = CompartmentChain.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;
        return shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - this.getTestingRatio(ageGroupIndex) * this.modificationSettings.getQuarantine());
    }

}
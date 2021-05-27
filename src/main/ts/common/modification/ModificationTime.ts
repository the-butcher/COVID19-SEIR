import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { AModification } from './AModification';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationContact } from './ModificationContact';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverSeasonality } from './ModificationResolverSeasonality';
import { ModificationResolverTesting } from './ModificationResolverTesting';
import { ModificationResolverVaccination } from './ModificationResolverVaccination';
import { ModificationSeasonality } from './ModificationSeasonality';
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

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
    }

    acceptUpdate(update: Partial<IModificationValuesTime>): void {
        // nothing to be updated
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
        this.modificationVaccination = new ModificationResolverVaccination().getModification(this.getInstantA());
        this.modificationSeasonality = new ModificationResolverSeasonality().getModification(this.getInstantA());
        // TODO from current model data get rT (which needs to be calculated yet)
    }

    getDosesPerDay(): number {
        return this.modificationVaccination.getDosesPerDay();
    }

    getSeasonality(): number {
        return this.modificationSeasonality.getSeasonality();
    }

    getTestingRatio(ageGroupIndex: number): number {
        return this.modificationTesting.getTestingRatio(ageGroupIndex);
    }

    getContacts(indexContact: number, indexParticipant: number): number {
        return this.getContactValue(indexContact, indexParticipant) * this.getTestingMultiplier(indexContact) * this.getTestingMultiplier(indexParticipant);
    }

    /**
     * get the value resulting from the effective contact matrix setting
     * @param indexContact
     * @param indexParticipant
     * @returns
     */
    getContactValue(indexContact: number, indexParticipant: number): number {
        return this.modificationContact.getContacts(indexContact, indexParticipant);
    }

    /**
     * assume that cases, once found, will infect less people due to isolation
     * therefore the full compartment sum is reduced (TODO, this has to be reflected in the model properly)
     * TODO verify this is correct
     * @param ageGroupIndex
     * @param indexParticipant
     * @returns
     */
    getTestingMultiplier(ageGroupIndex: number): number {
        return 1 - (this.modificationTesting.getTestingRatio(ageGroupIndex) * (1 - CompartmentChain.getInstance().getShareOfPresymptomaticInfection()));
    }

}
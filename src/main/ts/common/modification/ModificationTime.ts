import { IModificationValuesTime } from './IModificationValuesTime';
import { Modifications } from './Modifications';
import { CompartmentChain } from '../../model/compartment/CompartmentChain';
import { AModification } from './AModification';
import { IContactMatrix } from './IContactMatrix';
import { ModificationContact } from './ModificationContact';
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

    constructor(modificationParams: IModificationValuesTime) {
        super('TIME', 'INSTANT', modificationParams);
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
        this.modificationContact = Modifications.getInstance().findFirstApplicableOrElseDefault(this.getInstantA(), 'CONTACT') as ModificationContact;
        this.modificationTesting = Modifications.getInstance().findFirstApplicableOrElseDefault(this.getInstantA(), 'TESTING') as ModificationTesting;
        this.modificationVaccination = Modifications.getInstance().findFirstApplicableOrElseDefault(this.getInstantA(), 'VACCINATION') as ModificationVaccination;
    }

    getDosesPerDay(): number {
        return this.modificationVaccination.getDosesPerDay();
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

    getModificationValue(): number {
        return -1;
    }

}
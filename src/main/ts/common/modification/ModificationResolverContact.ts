import { Demographics } from '../demographics/Demographics';
import { ContactMatrixSums } from './../../client/controls/ContactMatrixSums';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesContact } from './IModificationValuesContact';
import { ModificationContact } from './ModificationContact';

/**
 * modification resolver for contact modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverContact extends AModificationResolver<IModificationValuesContact, ModificationContact> {

    constructor() {
        super('CONTACT');
    }

    getMaxValue(): number {
        return 1;
    }

    getValue(instant: number): number {
        return new ContactMatrixSums(this.getModification(instant)).getMatrixSum() / Demographics.getInstance().getMatrixSum();
    }

}
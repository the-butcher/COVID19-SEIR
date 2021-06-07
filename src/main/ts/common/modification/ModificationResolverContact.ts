import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ObjectUtil } from '../../util/ObjectUtil';
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

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return 1;
    }

    getTitle(): string {
        return 'contact rate';
    }

    getValue(instant: number): number {
        return new ContactMatrixSums(this.getModification(instant)).getMatrixSum() / Demographics.getInstance().getMatrixSum();
    }

}
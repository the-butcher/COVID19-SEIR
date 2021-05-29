import { ModelConstants } from './../../model/ModelConstants';
import { ControlsConstants } from './../../client/gui/ControlsConstants';
import { ContactMatrixEffective } from '../../client/controls/ContactMatrixEffective';
import { ContactMatrixSums } from '../../client/controls/ContactMatrixSums';
import { Demographics } from '../demographics/Demographics';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationTime } from './ModificationTime';

/**
 * modification resolver for time modifications
 * no-op
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverTime extends AModificationResolver<IModificationValuesTime, ModificationTime> {

    constructor() {
        super('TIME');
    }

    getMaxValue(): number {
        return 1;
    }

    getValue(instant: number): number {
        const modificationValues = this.getModifications()[0].getModificationValues();
        const modificationValuesCopy: IModificationValuesTime = {
            ...modificationValues,
            instant,
        } as IModificationValuesTime; // copy previous values
        const modificationTime = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification(modificationValuesCopy) as ModificationTime;
        modificationTime.setInstants(instant, instant);
        const contactMatrixEffective = new ContactMatrixEffective(modificationTime);
        const contactMatrixSums = new ContactMatrixSums(contactMatrixEffective);
        return contactMatrixSums.getMatrixSum() / Demographics.getInstance().getMatrixSum();
    }

}
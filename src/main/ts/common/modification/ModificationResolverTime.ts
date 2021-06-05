import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ContactMatrixSums } from '../../client/controls/ContactMatrixSums';
import { ContactMatrixExposure } from './../../client/controls/ContactMatrixExposure';
import { ModelConstants } from './../../model/ModelConstants';
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

    getMaxValue(data: IModificationData[]): number {
        return Math.max(...data.map(d => d.modValueY)) * 1.01;
    }

    getValue(instant: number): number {
        const modificationValues = this.getModifications()[0].getModificationValues();
        const modificationValuesCopy: IModificationValuesTime = {
            ...modificationValues,
            instant,
        } as IModificationValuesTime; // copy previous values
        const modificationTime = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification(modificationValuesCopy) as ModificationTime;
        modificationTime.setInstants(instant, instant);
        const contactMatrixExposure = new ContactMatrixExposure(modificationTime);
        const contactMatrixSums = new ContactMatrixSums(contactMatrixExposure);
        return contactMatrixSums.getMatrixSum();
    }

}
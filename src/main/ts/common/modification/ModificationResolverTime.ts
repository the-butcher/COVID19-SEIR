import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ContactMatrixSums } from '../../client/controls/ContactMatrixSums';
import { ContactMatrixExposure } from './../../client/controls/ContactMatrixExposure';
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

    getMinValue(data: IModificationData[]): number {
        return 0;
    }

    getMaxValue(data: IModificationData[]): number {
        return Math.max(...data.map(d => d.modValueY)) * 1.05;
    }

    getValue(instant: number): number {
        const contactMatrixExposure = new ContactMatrixExposure(instant);
        const contactMatrixSums = new ContactMatrixSums(contactMatrixExposure);
        return contactMatrixSums.getMatrixSum();
    }

}
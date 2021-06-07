import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ContactMatrixSums } from '../../client/controls/ContactMatrixSums';
import { ObjectUtil } from '../../util/ObjectUtil';
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

    static getInstance(): ModificationResolverTime {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ModificationResolverTime();
        }
        return this.instance;
        // return new ModificationResolverTime();
    }
    private static instance: ModificationResolverTime;

    private constructor() {
        super('TIME');
    }

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return Math.max(...this.getModificationData().map(d => d.modValueY)) * 1.05;
    }

    getTitle(): string {
        return 'exposure / day';
    }

    getValue(instant: number): number {
        const contactMatrixExposure = new ContactMatrixExposure(instant);
        const contactMatrixSums = new ContactMatrixSums(contactMatrixExposure);
        return contactMatrixSums.getMatrixSum();
    }

}
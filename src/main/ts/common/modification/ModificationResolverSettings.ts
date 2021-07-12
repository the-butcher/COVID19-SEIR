import { ModelConstants } from '../../model/ModelConstants';
import { ChartAgeGroup } from './../../client/chart/ChartAgeGroup';
import { Demographics } from './../demographics/Demographics';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesSettings } from './IModificationValuesSettings';
import { ModificationSettings } from './ModificationSettings';

/**
 * modification resolver for settings modifications
 * no-op
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverSettings extends AModificationResolver<IModificationValuesSettings, ModificationSettings> {

    constructor() {
        super('SETTINGS');
    }

    getMinValue(): number {
        return Demographics.getInstance().getAbsTotal() * 0.95;
    }

    getMaxValue(): number {
        return Demographics.getInstance().getAbsTotal() * 1.05;
    }

    getValue(instant: number): number {

        const dataItemCur = ChartAgeGroup.getInstance().findDataItemByInstant(instant);
        if (dataItemCur) {
            const value = dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_______ALL].TOTAL;
            // console.log('set', new Date(instant), value);
            return value;
        }
        return Number.NaN;
    }

    getTitle(): string {
        return 'total (control value)';
    }

}
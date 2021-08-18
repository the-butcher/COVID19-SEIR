import { ModelConstants } from './../../model/ModelConstants';
import { ChartAgeGroup } from '../../client/chart/ChartAgeGroup';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';
import { ModificationVaccination } from './ModificationVaccination';

/**
 * modification resolver for vaccination modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverVaccination extends AModificationResolver<IModificationValuesVaccination, ModificationVaccination> {

    constructor() {
        super('VACCINATION');
    }

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return 1;
    }

    getTitle(): string {
        return 'fully vaccinated';
    }

    getValue(instant: number): number {
        const dataItemCur = ChartAgeGroup.getInstance().findDataItemByInstant(instant);
        if (dataItemCur) {
            return dataItemCur.valueset[ModelConstants.AGEGROUP_NAME_______ALL].REMOVED_V2;
        }
        return Number.NaN;
    }

}
import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { ObjectUtil } from '../../util/ObjectUtil';
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
        return 0;
    }

    getMaxValue(): number {
        return 0;
    }

    getValue(instant: number): number {
        return Number.NaN;
    }

    getTitle(): string {
        return '';
    }

}
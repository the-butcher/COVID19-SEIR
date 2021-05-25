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

    getMaxValue(): number {
        return 1;
    }

    getValue(instant: number): number {
        return 0;
    }

}
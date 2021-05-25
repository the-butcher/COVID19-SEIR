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
        return 0; // TODO return a constant slope
    }

}
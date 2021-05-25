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

    getMaxValue(): number {
        return 100000;
    }

    getValue(instant: number): number {
        return this.getModification(instant).getDosesPerDay(); // TODO could be an interpolated value between this and the next modification
    }

}
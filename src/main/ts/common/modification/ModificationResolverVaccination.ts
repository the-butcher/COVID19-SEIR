import { IModificationData } from '../../client/chart/ChartAgeGroup';
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

    getMinValue(data: IModificationData[]): number {
        return 0;
    }

    getMaxValue(data: IModificationData[]): number {
        return 100000; // TODO this needs to be an expression of max population
    }

    getValue(instant: number): number {
        return this.getModification(instant).getDosesPerDay(); // TODO could be an interpolated value between this and the next modification
    }

}
import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesStrain } from './IModificationValuesStrain';
import { ModificationStrain } from './ModificationStrain';

/**
 * modification resolver for strain modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverStrain extends AModificationResolver<IModificationValuesStrain, ModificationStrain> {

    constructor() {
        super('STRAIN');
    }

    getMaxValue(data: IModificationData[]): number {
        return 1;
    }

    getValue(instant: number): number {
        return 0; // TODO find a way to ie show rT
    }

}
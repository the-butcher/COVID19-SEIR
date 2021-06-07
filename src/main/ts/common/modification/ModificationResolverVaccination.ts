import { ObjectUtil } from './../../util/ObjectUtil';
import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { AModificationResolver } from './AModificationResolver';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';
import { ModificationVaccination } from './ModificationVaccination';
import { Demographics } from '../demographics/Demographics';

/**
 * modification resolver for vaccination modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ModificationResolverVaccination extends AModificationResolver<IModificationValuesVaccination, ModificationVaccination> {

    // static getInstance(): ModificationResolverVaccination {
    //     // if (ObjectUtil.isEmpty(this.instance)) {
    //     //     this.instance = new ModificationResolverVaccination();
    //     // }
    //     // return this.instance;
    //     return new ModificationResolverVaccination();
    // }
    // private static instance: ModificationResolverVaccination;

    constructor() {
        super('VACCINATION');
    }

    getMinValue(): number {
        return 0;
    }

    getMaxValue(): number {
        return ObjectUtil.getMaxVaccinations(Demographics.getInstance().getAbsTotal());
    }

    getTitle(): string {
        return 'vaccinations / day';
    }

    getValue(instant: number): number {
        return this.getModification(instant).getDosesPerDay(); // TODO could be an interpolated value between this and the next modification
    }

}
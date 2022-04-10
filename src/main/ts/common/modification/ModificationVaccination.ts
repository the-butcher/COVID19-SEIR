// @ts-ignore
import { BaseData } from '../../model/basedata/BaseData';
import { IVaccinationConfig2 } from '../demographics/IVaccinationConfig2';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';

/**
 * implementation of IModification to hold configurable value for the vaccination model
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export class ModificationVaccination extends AModification<IModificationValuesVaccination> {

    constructor(modificationParams: IModificationValuesVaccination) {
        super('INSTANT', modificationParams);
    }

    /**
     * have the modification settings updated each time it is moved to a new location
     * @param instantA
     * @param instantB
     */
    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
        const baseDataItem = BaseData.getInstance().findBaseDataItem(instantA);
        if (baseDataItem) {
            const vaccinations: { [K in string]: IVaccinationConfig2 } = {};
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                vaccinations[ageGroup.getName()] = {
                    v1: baseDataItem.getVacc1(ageGroup.getName()) / ageGroup.getAbsValue(),
                    v2: baseDataItem.getVacc2(ageGroup.getName()) / ageGroup.getAbsValue(),
                    v3: baseDataItem.getVacc3(ageGroup.getName()) / ageGroup.getAbsValue(),
                    v4: 0
                }
            });
            this.acceptUpdate({
                vaccinations
            });
        }
    }

    acceptUpdate(update: Partial<IModificationValuesVaccination>): void {
        this.modificationValues = { ...this.modificationValues, ...update };
    }

    getVaccinationConfig2(ageGroup: string): IVaccinationConfig2 {
        return this.modificationValues.vaccinations[ageGroup];
    }

}
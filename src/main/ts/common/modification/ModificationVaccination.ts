import { IModificationValuesVaccination } from './IModificationValuesVaccination';
import { AModification } from './AModification';

/**
 * implementation of IModification for a specific amount of vaccination doses per day
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export class ModificationVaccination extends AModification<IModificationValuesVaccination> {

    constructor(modificationParams: IModificationValuesVaccination) {
        super('VACCINATION', 'INSTANT', modificationParams);
    }

    acceptUpdate(update: Partial<IModificationValuesVaccination>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getDosesPerDay(): number {
        return this.modificationValues.doses;
    }


    getModificationValue(): number {
        return this.getDosesPerDay();
    }

}
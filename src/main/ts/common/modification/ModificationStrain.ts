import { IModificationValuesStrain } from './IModificationValuesStrain';
import { AModification } from './AModification';

/**
 * implementation of IModification describing a single virus strain
 * Improve: add values for immune escape
 *
 * @author h.fleischer
 * @since 24.05.2021
 */
export class ModificationStrain extends AModification<IModificationValuesStrain> {

    constructor(modificationValues: IModificationValuesStrain) {
        super('INSTANT', modificationValues);
    }

    acceptUpdate(update: Partial<IModificationValuesStrain>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getIncidence(): number {
        return this.modificationValues.incidence;
    }

    getModificationValue(): number {
        return -1; // TODO maybe find a way to show r(t)
    }

}
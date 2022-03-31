import { AModification } from './AModification';
import { IModificationValuesStrain } from './IModificationValuesStrain';

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

    isPrimary(): boolean {
        return this.modificationValues.primary;
    }

    getR0(): number {
        return this.modificationValues.r0;
    }

    getIncidence(): number {
        return this.modificationValues.dstIncidence;
    }

    getSerialInterval(): number {
        return this.modificationValues.serialInterval;
    }

    getIntervalScale(): number {
        return this.modificationValues.intervalScale;
    }

    getImmuneEscape(): number {
        return this.modificationValues.immuneEscape;
    }

}
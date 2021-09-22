import { Demographics } from './../demographics/Demographics';
import { IModificationValuesSettings } from './IModificationValuesSettings';
import { AModification } from './AModification';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationSettings extends AModification<IModificationValuesSettings> {

    constructor(modificationParams: IModificationValuesSettings) {
        super('RANGE', modificationParams);
    }

    getUndetected(): number {
        return this.modificationValues.undetected;
    }

    getQuarantine(ageGroupIndex: number): number {
        // if (ageGroupIndex === 1) {
        //     return 1;
        // } else {
            return this.modificationValues.quarantine;
        // }
    }

    getReexposure(): number {
        return this.modificationValues.reexposure;
    }

    getDead(): number {
        return this.modificationValues.dead;
    }

}
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

    acceptUpdate(update: Partial<IModificationValuesSettings>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getRecoveredD(): number {
        return this.modificationValues.recoveredD;
    }

    getRecoveredU(): number {
        return this.modificationValues.recoveredU;
    }

    getVaccinated(): number {
        return this.modificationValues.vaccinated;
    }

    getQuarantine(): number {
        return this.modificationValues.quarantine;
    }

    getDead(): number {
        return this.modificationValues.dead;
    }

}
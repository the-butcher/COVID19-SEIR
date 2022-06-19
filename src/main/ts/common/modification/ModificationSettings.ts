import { Demographics } from './../demographics/Demographics';
import { IModificationValuesSettings } from './IModificationValuesSettings';
import { AModification } from './AModification';
import { getMaxListeners } from 'process';
import { ObjectUtil } from '../../util/ObjectUtil';
import { Modifications } from './Modifications';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationSettings extends AModification<IModificationValuesSettings> {

    static setupInstance(modificationValuesSettings: IModificationValuesSettings) {
        this.instance = new ModificationSettings(modificationValuesSettings);
    }
    static getInstance(): ModificationSettings {
        return this.instance;
    }
    static instance: ModificationSettings;

    constructor(modificationParams: IModificationValuesSettings) {
        super('RANGE', modificationParams);
    }

    getInitialUndetected(): number {
        return this.modificationValues.undetected;
    }

    getQuarantine(ageGroupIndex: number): number {
        return this.modificationValues.quarantine;
    }

    getReexposure(): number {
        return this.modificationValues.reexposure;
    }

    getDead(): number {
        return this.modificationValues.dead;
    }

    getPow1(): number {
        return this.modificationValues.pow;
    }

    getPow2(): number {
        return this.modificationValues.pow2;
    }
}
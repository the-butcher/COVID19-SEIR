import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { IModification } from './IModification';
import { IModificationValues } from './IModificationValues';
import { IModificationValuesContact } from './IModificationValuesContact';
import { IModificationValuesSeasonality } from './IModificationValuesSeasonality';
import { IModificationValuesSettings } from './IModificationValuesSettings';
import { IModificationValuesStrain } from './IModificationValuesStrain';
import { IModificationValuesTesting } from './IModificationValuesTesting';
import { IModificationValuesTime } from './IModificationValuesTime';
import { IModificationValuesVaccination } from './IModificationValuesVaccination';

export type IAnyModificationValue = IModificationValuesTime | IModificationValuesContact | IModificationValuesStrain | IModificationValuesTesting | IModificationValuesSettings | IModificationValuesTesting | IModificationValuesSeasonality | IModificationValuesVaccination;

/**
 * central storage of modification instances of various types
 * TODO needs to load some configuration (same format that gets passed to the model)
 *
 * @author h.fleischer
 * @since 17.04.2021
 */
export class Modifications {

    static setInstanceFromValues(modificationValues: IModificationValues[]): void {
        this.instance = new Modifications();
        modificationValues.forEach(modificationValue => {
            this.instance.addModification(ModelConstants.MODIFICATION_PARAMS[modificationValue.key].createValuesModification(modificationValue));
        });
        this.instance.updateModificationInstants();
    }

    static getInstance(): Modifications {
        return this.instance;
    }
    private static instance: Modifications;

    private modifications: Array<IModification<IModificationValues>>;

    constructor() {
        this.modifications = [];
    }

    buildModificationValues(): IModificationValues[] {

        const modificationValues: IModificationValues[] = [];
        this.getAllModifications().forEach(modification => {
            modificationValues.push(modification.getModificationValues());
        });
        return modificationValues;

    }

    /**
     * find a specific modification having the given id
     *
     * @param id
     * @returns
     */
    findModificationById(id: string): IModification<IModificationValues> {
        return this.modifications.find(modification => modification.getId() === id);
    }

    getAllModifications(): Array<IModification<IModificationValues>> {
        return this.modifications;
    }

    /**
     * find all modifications having the given type
     * @param key
     * @returns
     */
    findModificationsByType(key: MODIFICATION____KEY): Array<IModification<IModificationValues>> {
        return this.modifications.filter(m => m.getKey() === key);
    }

    deleteModification(id: string): void {
        const modification = this.findModificationById(id);
        this.modifications = this.modifications.filter(m => m.getId() !== id);
    }

    addModification(modification: IModification<IModificationValues>): void {
        this.modifications.push(modification);
    }

    updateModificationInstants(): void {
        this.modifications = this.modifications.sort((a, b) => {
            return a.getInstantA() - b.getInstantA();
        });
        Object.keys(ModelConstants.MODIFICATION_PARAMS).forEach((key: MODIFICATION____KEY) => {
            const typedModifications = this.findModificationsByType(key);
            if (typedModifications.length > 0) {
                for (let i=0; i<typedModifications.length-1; i++) {
                    typedModifications[i].setInstants(typedModifications[i].getInstantA(), typedModifications[i+1].getInstantA());
                }
                const lastModification = typedModifications[typedModifications.length - 1];
                lastModification.setInstants(lastModification.getInstantA(), ModelConstants.MODEL_MAX_____INSTANT);
            }
        });
    }


}
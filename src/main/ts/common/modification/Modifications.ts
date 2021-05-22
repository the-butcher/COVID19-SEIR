import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { IModification } from './IModification';
import { IModificationValues } from './IModificationValues';
import { ModificationContact } from './ModificationContact';
import { ModificationSeasonality } from './ModificationSeasonality';
import { ModificationSettings } from './ModificationSettings';
import { ModificationStrain } from './ModificationStrain';
import { ModificationTesting } from './ModificationTesting';
import { ModificationTime } from './ModificationTime';
import { ModificationVaccination } from './ModificationVaccination';

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
    }

    static getInstance(): Modifications {
        return this.instance;
    }
    private static instance: Modifications;

    private modifications: Array<IModification<IModificationValues>>;

    constructor() {

        this.modifications = [];

        // this.modifications.push(new ModificationStrain({
        //     id: ObjectUtil.createId(),
        //     key: 'STRAIN',
        //     instant: new Date('2021-06-01').getTime(),
        //     name: 'b.1.167.2',
        //     r0: 6.2,
        //     serialInterval: 4.8,
        //     intervalScale: 1.0,
        //     incidence: 2
        // }));
        // this.modifications.push(new ModificationContact({
        //     id: ObjectUtil.createId(),
        //     key: 'CONTACT',
        //     name: 'medium NPIs',
        //     instant: new Date('2021-05-19').getTime(),
        //     multipliers: {
        //         'family': 0.65,
        //         'school': 0.50,
        //         'nursing': 0.30,
        //         'work': 0.50,
        //         'other': 0.20,
        //     }
        // }));

        // requestAnimationFrame(() => {
        // setTimeout(() => {
            this.updateModificationInstants();
        // }, 100);

        // });

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

    findAllApplicable(instant: number, key: MODIFICATION____KEY): Array<IModification<IModificationValues>> {
        return this.findModificationsByType(key).filter(m => m.appliesToInstant(instant));
    }

    findFirstApplicableOrElseDefault(instant: number, key: MODIFICATION____KEY): IModification<IModificationValues> {
        const typedModifications = this.findModificationsByType(key);
        const applicableModification = typedModifications.find(m => m.appliesToInstant(instant));
        if (ObjectUtil.isNotEmpty(applicableModification)) {
            return applicableModification;
        } else if (ObjectUtil.isNotEmpty(ModelConstants.MODIFICATION_PARAMS[key].createDefaultModification)) {
            const defaultModification =  ModelConstants.MODIFICATION_PARAMS[key].createDefaultModification(ModelConstants.MODEL_MIN_______________DATE);
            if (typedModifications.length > 0) {
                defaultModification.setInstants(ModelConstants.MODEL_MIN_______________DATE, typedModifications[0].getInstantA());
            } else {
                defaultModification.setInstants(ModelConstants.MODEL_MIN_______________DATE, ModelConstants.MODEL_MAX_______________DATE);
            }
            return defaultModification;
        } else {
            return null;
        }
    }

    deleteModification(id: string): void {
        const modification = this.findModificationById(id);
        this.modifications = this.modifications.filter(m => m.getId() !== id);
    }

    addModification(modification: IModification<IModificationValues>): void {
        this.modifications.push(modification);
        this.updateModificationInstants();
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
                lastModification.setInstants(lastModification.getInstantA(), ModelConstants.MODEL_MAX_______________DATE);
            }
        });
    }


}
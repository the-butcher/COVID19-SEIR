import { IModification } from '../common/modification/IModification';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IModificationValuesContact } from '../common/modification/IModificationValuesContact';
import { IModificationValuesTesting } from '../common/modification/IModificationValuesTesting';
import { ModificationContact } from '../common/modification/ModificationContact';
import { ModificationSeasonality } from '../common/modification/ModificationSeasonality';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTesting } from '../common/modification/ModificationTesting';
import { ModificationTime } from '../common/modification/ModificationTime';
import { ModificationVaccination } from '../common/modification/ModificationVaccination';
import { ObjectUtil } from '../util/ObjectUtil';
import { IModificationValuesSeasonality } from './../common/modification/IModificationValuesSeasonality';
import { IModificationValuesSettings } from './../common/modification/IModificationValuesSettings';
import { IModificationValuesStrain } from './../common/modification/IModificationValuesStrain';
import { IModificationValuesTime } from './../common/modification/IModificationValuesTime';
import { IModificationValuesVaccination } from './../common/modification/IModificationValuesVaccination';

export type MODIFICATION_NATURE = 'INSTANT' | 'RANGE';
export type MODIFICATION____KEY = 'TIME' | 'STRAIN' | 'CONTACT' | 'TESTING' | 'VACCINATION' | 'SEASONALITY' | 'SETTINGS';

export interface IModificationDefinitions {
    deletable: boolean;
    createDefaultModification?: (instant: number) => IModification<IModificationValues>;
    createValuesModification: (modificationValues: IModificationValues) => IModification<IModificationValues>;
}

export class ModelConstants {

    static readonly MODIFICATION_PARAMS: {[K in MODIFICATION____KEY]:IModificationDefinitions} = {
        'TIME': {
            deletable: false,
            createValuesModification: (modificationValues) => new ModificationTime(modificationValues as IModificationValuesTime),
        },
        'STRAIN': {
            deletable: true,
            createValuesModification: (modificationValues) => new ModificationStrain(modificationValues as IModificationValuesStrain),
            createDefaultModification: (instant: number) => new ModificationStrain({
                id: ObjectUtil.createId(),
                key: 'STRAIN',
                instant,
                name: 'strain',
                r0: 3.3,
                serialInterval: 4.8,
                intervalScale: 1.0,
                incidence: 1
            }),
        },
        'CONTACT': {
            deletable: true,
            createValuesModification: (modificationValues) => new ModificationContact(modificationValues as IModificationValuesContact),
            createDefaultModification: (instant: number) => new ModificationContact({
                id: ObjectUtil.createId(),
                key: 'CONTACT',
                instant,
                name: 'contact',
                multipliers: {}
            }),
        },
        'TESTING': {
            deletable: true,
            createValuesModification: (modificationValues) => new ModificationTesting(modificationValues as IModificationValuesTesting),
            createDefaultModification: (instant: number) => new ModificationTesting({
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'testing',
                instant,
                multipliers: {}
            }),
        },
        'VACCINATION': {
            deletable: true,
            createValuesModification: (modificationValues) => new ModificationVaccination(modificationValues as IModificationValuesVaccination),
            createDefaultModification: (instant: number) => new ModificationVaccination({
                id: ObjectUtil.createId(),
                key: 'VACCINATION',
                name: 'vaccinations',
                instant,
                doses: 0
            }),
        },
        'SEASONALITY': {
            deletable: false,
            createValuesModification: (modificationValues) => new ModificationSeasonality(modificationValues as IModificationValuesSeasonality),
        },
        'SETTINGS': {
            deletable: false,
            createValuesModification: (modificationValues) => new ModificationSettings(modificationValues as IModificationValuesSettings),
        }
    };

    static readonly MODEL_MIN_______________DATE = new Date('2021-05-01').getTime();
    static readonly MODEL_MAX_______________DATE = new Date('2021-09-01').getTime();

    static readonly PRELOAD_________________DAYS = 15;
    static readonly VACCINATION_TO_IMMUNITY_DAYS = 35;
    static readonly AGE_GROUP_ALL = -1;

    static readonly RANGE__PERCENTAGE_100 = [0.00, 0.25, 0.50, 0.75, 1.00];
    static readonly RANGE__PERCENTAGE__10 = [0.0, 0.1];
    static readonly RANGE__PERCENTAGE__60 = [0.6, 0.7, 0.8, 0.9, 1.0];
    static readonly RANGE______INCUBATION = [1, 7, 14];
    static readonly RANGE_______INCIDENCE = [1, 250, 500, 750, 1000];
    static readonly RANGE_SERIAL_INTERVAL = [2, 3, 4, 5, 6, 7, 8];
    static readonly RANGE______________R0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

}



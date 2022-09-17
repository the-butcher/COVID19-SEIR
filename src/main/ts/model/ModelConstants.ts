import { IVaccinationConfig } from '../common/demographics/IVaccinationConfig';
import { IModification } from '../common/modification/IModification';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IModificationValuesContact } from '../common/modification/IModificationValuesContact';
import { IModificationValuesDiscovery } from '../common/modification/IModificationValuesDiscovery';
import { IModificationValuesRegression } from '../common/modification/IModificationValuesRegression';
import { ModificationContact } from '../common/modification/ModificationContact';
import { ModificationDiscovery } from '../common/modification/ModificationDiscovery';
import { ModificationRegression } from '../common/modification/ModificationRegression';
import { ModificationSeasonality } from '../common/modification/ModificationSeasonality';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { ModificationVaccination } from '../common/modification/ModificationVaccination';
import { ObjectUtil } from '../util/ObjectUtil';
import { Demographics } from './../common/demographics/Demographics';
import { IModificationValuesSeasonality } from './../common/modification/IModificationValuesSeasonality';
import { IModificationValuesSettings } from './../common/modification/IModificationValuesSettings';
import { IModificationValuesStrain } from './../common/modification/IModificationValuesStrain';
import { IModificationValuesTime } from './../common/modification/IModificationValuesTime';
import { IModificationValuesVaccination } from './../common/modification/IModificationValuesVaccination';

export type MODIFICATION_NATURE = 'INSTANT' | 'RANGE';
export type MODIFICATION____KEY = 'TIME' | 'STRAIN' | 'CONTACT' | 'TESTING' | 'VACCINATION' | 'SEASONALITY' | 'SETTINGS' | 'REGRESSION';
export type MODIFICATION__FETCH = 'INTERPOLATE' | 'CREATE';

export interface IModificationDefinitions {
    createDefaultModification?: (instant: number) => IModification<IModificationValues>;
    createValuesModification: (modificationValues: IModificationValues) => IModification<IModificationValues>;
}

/**
 * collection of type specific functionality, think methods on enum-constants
 * there is another, gui specific, class like this: ControlsConstants
 *
 * @author h.fleischer
 * @since 30.05.2021
 */

export class ModelConstants {

    static readonly CONFIG_VERSION = 'AT_0_00_06';

    static readonly MODIFICATION_PARAMS: { [K in MODIFICATION____KEY]: IModificationDefinitions } = {
        'REGRESSION': {
            createValuesModification: (modificationValues) => new ModificationRegression(modificationValues as IModificationValuesRegression),
        },
        'TIME': {
            createValuesModification: (modificationValues) => new ModificationTime(modificationValues as IModificationValuesTime),
            createDefaultModification: (instant: number) => new ModificationTime({
                id: ObjectUtil.createId(),
                key: 'TIME',
                instant,
                name: 'time',
                deletable: true,
                draggable: true
            }),
        },
        'STRAIN': {
            createValuesModification: (modificationValues) => new ModificationStrain(modificationValues as IModificationValuesStrain),
            createDefaultModification: (instant: number) => new ModificationStrain({
                id: ObjectUtil.createId(),
                key: 'STRAIN',
                instant,
                name: 'b.1.1.7',
                r0: 4.4,
                serialInterval: 4.8,
                intervalScale: 1.0,
                timeToWane: 5.0,
                immuneEscape: 0.0,
                strainEscape: {},
                dstIncidence: 1,
                deletable: true,
                draggable: true,
                primary: false,
            }),
        },
        'CONTACT': {
            createValuesModification: (modificationValues) => new ModificationContact(modificationValues as IModificationValuesContact),
            createDefaultModification: (instant: number) => new ModificationContact({
                id: ObjectUtil.createId(),
                key: 'CONTACT',
                instant,
                name: 'contact',
                multipliers: {},
                deletable: true,
                draggable: true,
                readonly: false
            }),
        },
        'TESTING': {
            createValuesModification: (modificationValues) => new ModificationDiscovery(modificationValues as IModificationValuesDiscovery),
            createDefaultModification: (instant: number) => new ModificationDiscovery({
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'testing',
                instant,
                testRate: 0.02,
                factorWeight: 0.7,
                corrections: {},
                deletable: true,
                draggable: true,
                blendable: true
            }),
        },
        'VACCINATION': {
            createValuesModification: (modificationValues) => new ModificationVaccination(modificationValues as IModificationValuesVaccination),
            createDefaultModification: (instant: number) => {
                const vaccinations: { [K in string]: IVaccinationConfig } = {};
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                    vaccinations[ageGroup.getName()] = {
                        v1: 0,
                        v2: 0,
                        v3: 0,
                        v4: 0
                    }
                });
                return new ModificationVaccination({
                    id: ObjectUtil.createId(),
                    key: 'VACCINATION',
                    name: 'testing',
                    instant,
                    deletable: true,
                    draggable: true,
                    vaccinations
                });
            }
        },
        'SEASONALITY': {
            createValuesModification: (modificationValues) => new ModificationSeasonality(modificationValues as IModificationValuesSeasonality),
        },
        'SETTINGS': {
            createValuesModification: (modificationValues) => new ModificationSettings(modificationValues as IModificationValuesSettings),
        }
    };

    static readonly PRELOAD_________________DAYS = 7;
    static readonly APPROXIMATION_________CYCLES = 3;

    static readonly AGE_GROUP_ALL = -1;

    static readonly AGEGROUP_NAME_______ALL = 'TOTAL';
    static readonly STRAIN_ID___________ALL = 'MULTI';

    static readonly BASE_DATA_INDEX_EXPOSED = 0;
    static readonly BASE_DATA_INDEX_REMOVED = 1;
    static readonly BASE_DATA_INDEX_VACC1ST = 2;
    static readonly BASE_DATA_INDEX_VACC2ND = 3;
    static readonly BASE_DATA_INDEX_VACC3RD = 4;
    static readonly BASE_DATA_INDEX_VACC4TH = 5;
    static readonly BASE_DATA_INDEX___TESTS = 6;
    static readonly BASE_DATA_INDEX__MOBI_O = 7;
    static readonly BASE_DATA_INDEX__MOBI_W = 8;
    static readonly BASE_DATA_INDEX__MOBI_H = 9;

    static readonly RANGE____PERCENTAGE_250 = [0.00, 0.50, 1.00, 1.50, 2.00, 2.50];
    static readonly RANGE____PERCENTAGE_125 = [0.00, 0.25, 0.50, 0.75, 1.00, 1.25];
    static readonly RANGE____PERCENTAGE_100 = [0.00, 0.25, 0.50, 0.75, 1.00];
    static readonly RANGE____PERCENTAGE__10 = [0.0, 0.1];
    static readonly RANGE____PERCENTAGE__25 = [0.00, 0.25, 0.5, 0.75, 1.0];
    static readonly RANGE________REEXPOSURE = [0, 3, 6, 9, 12, 15];
    static readonly RANGE________INCUBATION = [1, 7, 14];
    static readonly RANGE____INCIDENCE_1000 = [0, 250, 500, 750, 1000];
    static readonly RANGE_____INCIDENCE__10 = [0, 2, 4, 6, 8, 10];
    static readonly RANGE___SERIAL_INTERVAL = [2, 3, 4, 5, 6, 7, 8];
    static readonly RANGE________________R0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    static readonly RANGE________UNDETECTED = [0, 1, 2, 3];
    static readonly RANGE_________BACK_DAYS = [-35, -14, 0, 35, 70, 105, 140];

}



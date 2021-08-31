import { IModification } from '../common/modification/IModification';
import { IModificationValuesDiscovery } from '../common/modification/IModificationValueDiscovery';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IModificationValuesContact } from '../common/modification/IModificationValuesContact';
import { ModificationContact } from '../common/modification/ModificationContact';
import { ModificationDiscovery } from '../common/modification/ModificationDiscovery';
import { ModificationSeasonality } from '../common/modification/ModificationSeasonality';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
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

/**
 * enumeration of infectious type
 * PRIMARY - infected, having been susceptible previously
 * BREAKTHROUGH - infected, having been vaccinated previously
 */
export type INFECTIOUS_____TYPE = 'PRIMARY' | 'BREAKTHROUGH';

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

    static readonly CONFIG_VERSION = 'AT_0_00_03';

    static readonly MODIFICATION_PARAMS: {[K in MODIFICATION____KEY]:IModificationDefinitions} = {
        'TIME': {
            createValuesModification: (modificationValues) => new ModificationTime(modificationValues as IModificationValuesTime),
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
                dstIncidence: 1,
                deletable: true,
                draggable: true,
                blendable: false,
                primary: false
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
                blendable: false,
                draggable: true
            }),
        },
        'TESTING': {
            createValuesModification: (modificationValues) => new ModificationDiscovery(modificationValues as IModificationValuesDiscovery),
            createDefaultModification: (instant: number) => new ModificationDiscovery({
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'testing',
                instant,
                multipliers: {},
                deletable: true,
                draggable: true,
                blendable: false
            }),
        },
        'VACCINATION': {
            createValuesModification: (modificationValues) => new ModificationVaccination(modificationValues as IModificationValuesVaccination),
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

    // static readonly V1_TO_V2_______DEFAULT_WEEKS = 8;

    static readonly AGE_GROUP_ALL = -1;

    static readonly AGEGROUP_NAME_______ALL = 'TOTAL';
    static readonly STRAIN_ID___________ALL = 'MULTI';

    static readonly BASE_DATA_INDEX_EXPOSED = 0;
    static readonly BASE_DATA_INDEX_REMOVED = 1;
    static readonly BASE_DATA_INDEX_VACC1ST = 2;
    static readonly BASE_DATA_INDEX_VACC2ND = 3;
    static readonly BASE_DATA_INDEX___TESTS = 4;

    static readonly RANGE____PERCENTAGE_250 = [0.00, 0.50, 1.00, 1.50, 2.00];
    static readonly RANGE____PERCENTAGE_100 = [0.00, 0.25, 0.50, 0.75, 1.00];
    static readonly RANGE____PERCENTAGE__10 = [0.0, 0.1];
    static readonly RANGE____PERCENTAGE__60 = [0.6, 0.7, 0.8, 0.9, 1.0];
    static readonly RANGE________REEXPOSURE = [6, 9, 12, 15, 18, 21, 24];
    static readonly RANGE________INCUBATION = [1, 7, 14];
    static readonly RANGE____INCIDENCE_1000 = [0, 250, 500, 750, 1000];
    static readonly RANGE_____INCIDENCE__10 = [0, 2, 4, 6, 8, 10];
    static readonly RANGE___SERIAL_INTERVAL = [2, 3, 4, 5, 6, 7, 8];
    static readonly RANGE________________R0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    static readonly RANGE________UNDETECTED = [0, 1, 2, 3];

}



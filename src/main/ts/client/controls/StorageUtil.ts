import { IModificationValues } from '../../common/modification/IModificationValues';
import { IModificationValuesContact } from '../../common/modification/IModificationValuesContact';
import { IModificationValuesSeasonality } from '../../common/modification/IModificationValuesSeasonality';
import { IModificationValuesSettings } from '../../common/modification/IModificationValuesSettings';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { IModificationValuesTesting } from '../../common/modification/IModificationValuesTesting';
import { IModificationValuesTime } from '../../common/modification/IModificationValuesTime';
import { IModificationValuesVaccination } from '../../common/modification/IModificationValuesVaccination';
import { Modifications } from '../../common/modification/Modifications';
import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';

export type IAnyModificationValue = IModificationValuesTime | IModificationValuesContact | IModificationValuesStrain | IModificationValuesTesting | IModificationValuesSettings | IModificationValuesTesting | IModificationValuesSeasonality | IModificationValuesVaccination;

/**
 * helper type for writing / loading modifications to / from local storage
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class StorageUtil {

    static readonly STORAGE_KEY_MODIFICATIONS = 'modifications';

    static getInstance(): StorageUtil {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new StorageUtil();
        }
        return this.instance;
    }
    private static instance: StorageUtil;

    private readonly storageEnabled: boolean;

    constructor() {
        this.storageEnabled = this.evalStorageEnabled();
    }

    saveModifications(): void {
        if (this.isStorageEnabled()) {
            const modificationValues = Modifications.getInstance().buildModificationValues();
            localStorage.setItem(StorageUtil.STORAGE_KEY_MODIFICATIONS, JSON.stringify(modificationValues));
        }
    }

    loadModifications(): IModificationValues[] {

        if (this.isStorageEnabled()) {

            const modificationValues = localStorage.getItem(StorageUtil.STORAGE_KEY_MODIFICATIONS);
            if (ObjectUtil.isNotEmpty(modificationValues)) {
                return JSON.parse(modificationValues);
            } else {
                return this.createDefaultModificationValues();
            }

        } else {
            return this.createDefaultModificationValues();
        }
    }

    createDefaultModificationValues(): IModificationValues[] {

        const modificationValues: IAnyModificationValue[] = [
            {
                id: ObjectUtil.createId(),
                key: 'SEASONALITY',
                name: 'seasonality',
                instant: new Date('2021-07-10').getTime(),
                seasonality: 0.90,
                deletable: false,
                draggable: true
            },
            {
                id: ObjectUtil.createId(),
                key: 'SETTINGS',
                name: 'initial state',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                recoveredD: 0.12,
                recoveredU: 0.12,
                vaccinated: 0.22,
                dead: 0.001,
                deletable: false,
                draggable: false
            },
            {
                id: ObjectUtil.createId(),
                key: 'TIME',
                name: 'effective settings',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                deletable: false,
                draggable: true
            },
            {
                id: ObjectUtil.createId(),
                key: 'STRAIN',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                name: 'b.1.1.7',
                r0: 4.4,
                serialInterval: 4.8,
                intervalScale: 1.0,
                incidence: 150,
                deletable: false,
                draggable: false
            },
            // {
            //     id: ObjectUtil.createId(),
            //     key: 'STRAIN',
            //     instant: new Date('2021-06-01').getTime(),
            //     name: 'b.1.167.2',
            //     r0: 6.5,
            //     serialInterval: 4.8,
            //     intervalScale: 1.0,
            //     incidence: 10,
            //     deletable: true,
            //     draggable: true
            // },
            {
                id: ObjectUtil.createId(),
                key: 'CONTACT',
                name: 'initial NPIs',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                multipliers: {
                    'family': 0.65,
                    'school': 0.25,
                    'nursing': 0.30,
                    'work': 0.50,
                    'other': 0.20
                },
                deletable: false,
                draggable: false
            },
            {
                id: ObjectUtil.createId(),
                key: 'TESTING',
                name: 'initial discovery',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                multipliers: {
                    'family': 0.40,
                    'school': 0.60,
                    'nursing': 0.75,
                    'work': 0.10,
                    'other': 0.10
                },
                deletable: false,
                draggable: false
            },
            {
                id: ObjectUtil.createId(),
                key: 'VACCINATION',
                name: 'initial vaccinations',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                doses: 100000,
                deletable: false,
                draggable: false
            }
        ];

        return modificationValues;

    }

    isStorageEnabled(): boolean {
        return this.storageEnabled;
    }

    private evalStorageEnabled(): boolean {
        let storage;
        try {
            storage = window.localStorage
            const testItem = '__storage_test__';
            storage.setItem(testItem, testItem);
            storage.removeItem(testItem);
            return true;
        }
        catch(e) {
            return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                (storage && storage.length !== 0);
        }
    }

}
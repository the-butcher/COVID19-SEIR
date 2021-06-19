import { Demographics } from '../../common/demographics/Demographics';
import { Modifications } from '../../common/modification/Modifications';
import { BaseData } from '../../model/basedata/BaseData';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { ModelActions } from '../gui/ModelActions';
import { SliderModification } from '../gui/SliderModification';
import { ModelTask } from '../ModelTask';
import { TimeUtil } from './../../util/TimeUtil';
import { IStoredConfig } from './IStoredConfig';

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

    storeModifications(): void {
        if (this.isStorageEnabled()) {
            localStorage.setItem(StorageUtil.STORAGE_KEY_MODIFICATIONS, JSON.stringify(this.createStorableConfig()));
        }
    }

    createStorableConfig(): IStoredConfig {
        return {
            model______basedata: BaseData.getInstance().getPath(),
            model__demographics: Demographics.getInstance().getPath(),
            model_____daterange: SliderModification.getInstance().getTickValues().map(t => TimeUtil.formatConfigDate(t)),
            model_modifications: Modifications.getInstance().buildModificationValues()
        }
    }

    exportModifications(): void {
        this.exportJson(this.createStorableConfig());
    }

    exportJson(object: any): void {

        const modificationValueJson = JSON.stringify(object, null, 2);
        const modificationValueBlob = new Blob([modificationValueJson], { type: "text/plain;charset=utf-8" });

        const url = window.URL || window.webkitURL;
        const link = url.createObjectURL(modificationValueBlob);
        var a = document.createElement("a");
        a.download = `${ObjectUtil.createDownloadName()}.json`;
        a.href = link;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    }

    importConfig(): void {

        const fileInput = document.getElementById('jsonImportInput') as HTMLInputElement;
        fileInput.onchange = (e: Event) => {

            // @ts-ignore
            var file = e.target.files[0];
            if (!file) {
                console.warn('no file');
                return;
            }

            var reader = new FileReader();
            reader.onload = e => {

                /**
                 * read and build modifications
                 */
                const importedConfig: IStoredConfig = JSON.parse(e.target.result as string);
                SliderModification.getInstance().setRange(importedConfig.model_____daterange.map(d => new Date(d).getTime()));
                // importedConfig.model_modifications.forEach(modificationValue => {
                //     ModelConstants.MODIFICATION_PARAMS[modificationValue.key].createValuesModification(modificationValue); // just a check
                // });
                Modifications.setInstanceFromValues(importedConfig.model_modifications);

                /**
                 * show in modification sliders
                 */
                SliderModification.getInstance().showModifications(ModelActions.getInstance().getKey());

                /**
                 * rebuild chart to reflect changes
                 */
                ModelTask.commit(ModelActions.getInstance().getKey(), ControlsConstants.createWorkerInput());

            }
            reader.readAsText(file);

        }
        fileInput.click();

    }

    loadConfig(): IStoredConfig {

        if (this.isStorageEnabled()) {

            const loadedConfig = localStorage.getItem(StorageUtil.STORAGE_KEY_MODIFICATIONS);
            if (ObjectUtil.isNotEmpty(loadedConfig)) {
                return JSON.parse(loadedConfig);
            } else {
                return this.createDefaultConfig();
            }

        } else {
            return this.createDefaultConfig();
        }

    }

    createDefaultConfig(): IStoredConfig {

        const minInstant = new Date('2021-05-01').getTime();
        return {
            model______basedata: `data/heatmap-data-at.json?cb=${ObjectUtil.createId()}`,
            model__demographics: `data/model-data-at.json?cb=${ObjectUtil.createId()}`,
            model_____daterange: [
                '2021-05-01',
                '2021-06-01',
                '2021-07-01',
                '2021-08-01',
                '2021-09-01',
                '2021-10-01',
                //'2021-11-01',
                //'2021-12-01',
                //'2022-01-01',
                //'2022-02-01',
                //'2022-03-01',
                //'2022-04-01',
                //'2022-04-30'
            ],
            model_modifications: [
                {
                    id: ObjectUtil.createId(),
                    key: 'SEASONALITY',
                    name: 'seasonality',
                    instant: new Date('2021-07-10').getTime(),
                    seasonality: 0.80,
                    deletable: false,
                    draggable: true
                },
                {
                    id: ObjectUtil.createId(),
                    key: 'SETTINGS',
                    name: 'initial state',
                    instant: minInstant,
                    undetected: 1.00,
                    quarantine: 0.50,
                    dead: 0.001,
                    deletable: false,
                    draggable: false
                },
                {
                    id: ObjectUtil.createId(),
                    key: 'TIME',
                    name: 'effective settings',
                    instant: minInstant,
                    deletable: false,
                    draggable: true
                },
                {
                    id: ObjectUtil.createId(),
                    key: 'STRAIN',
                    instant: minInstant,
                    name: 'b.1.1.7',
                    r0: 4.4,
                    serialInterval: 4.8,
                    intervalScale: 1.0,
                    dstIncidence: 150,
                    deletable: false,
                    draggable: false,
                    primary: true,
                },
                {
                    id: ObjectUtil.createId(),
                    key: 'CONTACT',
                    name: 'initial NPIs',
                    instant: minInstant,
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
                    instant: minInstant,
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
                    instant: minInstant,
                    doses: 100000,
                    deletable: false,
                    draggable: false
                }
            ]
        }


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
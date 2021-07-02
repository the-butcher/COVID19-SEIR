import { Demographics } from '../../common/demographics/Demographics';
import { Modifications } from '../../common/modification/Modifications';
import { BaseData } from '../../model/calibration/BaseData';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { ModelActions } from '../gui/ModelActions';
import { SliderModification } from '../gui/SliderModification';
import { ModelTask } from '../ModelTask';
import { JsonLoader } from './../../util/JsonLoader';
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
        // console.log('mv', Modifications.getInstance().buildModificationValues());
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

    async loadConfig(): Promise<IStoredConfig> {

        if (this.isStorageEnabled()) {

            const loadedConfig = localStorage.getItem(StorageUtil.STORAGE_KEY_MODIFICATIONS);
            if (ObjectUtil.isNotEmpty(loadedConfig)) {
                return JSON.parse(loadedConfig);
            } else {
                return this.loadDefaultConfig();
            }

        } else {
            return this.loadDefaultConfig();
        }

    }

    async loadDefaultConfig(): Promise<IStoredConfig> {
        return await new JsonLoader().load(`data/default-config.json?cb=${ObjectUtil.createId()}`);
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
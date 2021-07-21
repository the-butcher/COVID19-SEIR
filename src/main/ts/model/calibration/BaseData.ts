import { AgeGroup } from './../../common/demographics/AgeGroup';
import { ModelConstants } from './../ModelConstants';
import { JsonLoader } from '../../util/JsonLoader';
import { ControlsConstants } from '../../client/gui/ControlsConstants';
import { TimeUtil } from '../../util/TimeUtil';

export interface IBaseDataConfig {
    [K: string]: IBaseDataItem;
}

export interface IBaseDataItem {
    "TOTAL": number[];
    "<= 04": number[];
    "05-14": number[];
    "15-24": number[];
    "25-34": number[];
    "35-44": number[];
    "45-54": number[];
    "55-64": number[];
    "65-74": number[];
    "75-84": number[];
    ">= 85": number[];
}

export class BaseData {

    static async setInstanceFromPath(path: string): Promise<void> {
        const baseData = await new JsonLoader().load(path);
        BaseData.setInstanceFromConfig(path, baseData);
    }

    static setInstanceFromConfig(path: string, baseDataset: {[K: string]: IBaseDataItem}): void {
        this.instance = new BaseData(path, baseDataset);
    }

    static getInstance(): BaseData {
        return this.instance;
    }

    static getVacc1(sourceItem: IBaseDataItem, ageGroupName: string): number {
        return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
    }

    static getVacc2(sourceItem: IBaseDataItem, ageGroupName: string): number {
        return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
    }

    static getExposed(sourceItem: IBaseDataItem, ageGroupName: string): number {
        return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_EXPOSED];
    }

    static getRemoved(sourceItem: IBaseDataItem, ageGroupName: string): number {
        return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_REMOVED];
    }

    private static instance: BaseData;

    private readonly path: string;
    private readonly baseDataset: {[K: string]: IBaseDataItem};

    constructor(path: string, baseDataset: {[K: string]: IBaseDataItem}) {
        this.path = path;
        this.baseDataset = baseDataset;
    }

    getPath(): string {
        return this.path;
    }

    getBaseDataConfig(): IBaseDataConfig {
        return this.baseDataset;
    }

    findBaseData(categoryX: string): IBaseDataItem {
        return this.baseDataset[categoryX];
    }

    findIncidences(instant: number, ageGroups: AgeGroup[]): number[] {

        const dataItemA = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(instant - TimeUtil.MILLISECONDS_PER____DAY * 7));
        const dataItemB = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(instant));
        if (dataItemA && dataItemB) {
            return ageGroups.map(g => (dataItemB[g.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED] - dataItemA[g.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED]) * 100000 / g.getAbsValue());
        } else {
            return [];
        }

    }


}
import { JsonLoader } from '../../util/JsonLoader';
import { AgeGroup } from './../../common/demographics/AgeGroup';
import { TimeUtil } from './../../util/TimeUtil';
import { BaseDataItem, IBaseDataItem } from './BaseDataItem';

export interface IBaseDataConfig {
    [K: string]: IBaseDataItemConfig;
}

export interface IBaseDataItemConfig {

    /**
     * age-group key, and age group data
     */
    [K : string]: number[];

}

export class BaseData {

    /**
     * initial setup of BaseData instance (at runtime)
     * @param path
     */
    static async setInstanceFromPath(path: string): Promise<void> {
        const baseData = await new JsonLoader().load(path);
        BaseData.setInstanceFromConfig(path, baseData);
    }

    /**
     * initial setup of BaseData instance (at runtime)
     * @param path
     */
    static setInstanceFromConfig(path: string, baseDataset: {[K: string]: IBaseDataItemConfig}): void {
        this.instance = new BaseData(path, baseDataset);
    }

    static getInstance(): BaseData {
        return this.instance;
    }


    // static getVacc1(sourceItem: IBaseDataItemConfig, ageGroupName: string): number {
    //     return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
    // }

    // static getVacc2(sourceItem: IBaseDataItemConfig, ageGroupName: string): number {
    //     return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
    // }

    // static getExposed(sourceItem: IBaseDataItemConfig, ageGroupName: string): number {
    //     return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_EXPOSED];
    // }

    // static getRemoved(sourceItem: IBaseDataItemConfig, ageGroupName: string): number {
    //     return sourceItem[ageGroupName][ModelConstants.BASE_DATA_INDEX_REMOVED];
    // }

    private static instance: BaseData;

    private readonly path: string;
    private readonly baseDataset: {[K: string]: IBaseDataItemConfig};
    private readonly baseDataItems: {[K: string]: IBaseDataItem};

    constructor(path: string, baseDataset: {[K: string]: IBaseDataItemConfig}) {
        this.path = path;
        this.baseDataset = baseDataset;
        this.baseDataItems = {};
    }

    getPath(): string {
        return this.path;
    }

    getBaseDataConfig(): IBaseDataConfig {
        return this.baseDataset;
    }

    findBaseDataItem(instant: number): IBaseDataItem {
        const categoryX = TimeUtil.formatCategoryDate(instant);
        return this.baseDataItems[categoryX] || this.buildBaseDataItem(categoryX);
    }

    buildBaseDataItem(categoryX: string): IBaseDataItem {
        const baseDataItemConfig = this.baseDataset[categoryX];
        if (baseDataItemConfig) {
            this.baseDataItems[categoryX] = new BaseDataItem(this.baseDataset[categoryX]);
            return this.baseDataItems[categoryX];
        } else {
            return undefined;
        }
    }

    /**
     * calculates an array of incidences (age-group wise) for the given instant
     * @param instant
     * @param ageGroups
     * @returns
     */
    findIncidences(instant: number, ageGroups: AgeGroup[]): number[] {

        // const incidences3 = this.findIncidences2(instant + TimeUtil.MILLISECONDS_PER____DAY * 3, ageGroups);
        // const incidences4 = this.findIncidences2(instant + TimeUtil.MILLISECONDS_PER____DAY * 4, ageGroups);
        // const incidences = [];
        // if (incidences3 && incidences4) {
        //     for (let i=0; i<incidences3.length; i++) {
        //         incidences[i] = (incidences3[i] + incidences4[i]) / 2;
        //     }
        //     return incidences;

        // } else {
        //     return undefined;
        // }

        const dataItemA = BaseData.getInstance().findBaseDataItem(instant - TimeUtil.MILLISECONDS_PER____DAY * 7);
        const dataItemB = BaseData.getInstance().findBaseDataItem(instant);
        if (dataItemA && dataItemB) {
            // return ageGroups.map(g => (dataItemB[g.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED] - dataItemA[g.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED]) * 100000 / g.getAbsValue());
            return ageGroups.map(g => (dataItemB.getExposed(g.getName()) - dataItemA.getExposed(g.getName())) * 100000 / g.getAbsValue());
        } else {
            return undefined;
        }

    }

    // findIncidences2(instant: number, ageGroups: AgeGroup[]): number[] {

    //     const dataItemA = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(instant - TimeUtil.MILLISECONDS_PER____DAY * 7));
    //     const dataItemB = BaseData.getInstance().findBaseData(TimeUtil.formatCategoryDate(instant));
    //     if (dataItemA && dataItemB) {
    //         return ageGroups.map(g => (dataItemB[g.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED] - dataItemA[g.getName()][ModelConstants.BASE_DATA_INDEX_EXPOSED]) * 100000 / g.getAbsValue());
    //     } else {
    //         return undefined;
    //     }

    // }


}
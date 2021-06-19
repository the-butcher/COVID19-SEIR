
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

    static async setInstanceFromConfig(baseDataset: {[K: string]: IBaseDataItem}): Promise<void> {
        this.instance = new BaseData(baseDataset);
    }

    static getInstance(): BaseData {
        return this.instance;
    }

    private static instance: BaseData;

    private readonly baseDataset: {[K: string]: IBaseDataItem};

    constructor(baseDataset: {[K: string]: IBaseDataItem}) {
        this.baseDataset = baseDataset;
    }

    getBaseDataConfig(): IBaseDataConfig {
        return this.baseDataset;
    }

    findBaseData(categoryX: string): IBaseDataItem {
        return this.baseDataset[categoryX];
    }

}
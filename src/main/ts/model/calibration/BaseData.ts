import { JsonLoader } from '../../util/JsonLoader';

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

}
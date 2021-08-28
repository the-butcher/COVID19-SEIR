import { ModelConstants } from '../ModelConstants';
import { IBaseDataItemConfig } from './BaseData';

export interface IBaseDataItem {
    getExposed(ageGroupName: string): number;
    getRemoved(ageGroupName: string): number;
    getVacc1(ageGroupName: string): number;
    getVacc2(ageGroupName: string): number;
    getTests(): number;
}

export class BaseDataItem implements IBaseDataItem {

    private readonly itemConfig: IBaseDataItemConfig;

    constructor(itemConfig: IBaseDataItemConfig) {
        this.itemConfig = itemConfig;
    }

    getExposed(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_EXPOSED];
    }

    getRemoved(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_REMOVED];
    }

    getVacc1(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
    }

    getVacc2(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
    }

    getTests(): number {
        return this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX___TESTS];
    }

}
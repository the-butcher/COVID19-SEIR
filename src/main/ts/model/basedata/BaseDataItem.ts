import { Demographics } from './../../common/demographics/Demographics';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelConstants } from '../ModelConstants';
import { BaseData, IBaseDataItemConfig } from './BaseData';

export interface IBaseDataItem {
    getExposed(ageGroupName: string): number;
    getRemoved(ageGroupName: string): number;
    getVacc1(ageGroupName: string): number;
    getVacc2(ageGroupName: string): number;
    getTests(): number;
    getIncidence(ageGroupIndex: number): number;
    getTestsM7(): number;
    getCasesM1(ageGroupIndex: number): number;
}

export class BaseDataItem implements IBaseDataItem {

    private readonly instant: number;
    private readonly itemConfig: IBaseDataItemConfig;
    private readonly incidences: number[];
    private testsM7: number;
    private casesM1: number[];

    constructor(instant: number, itemConfig: IBaseDataItemConfig) {
        this.instant = instant;
        this.itemConfig = itemConfig;
        this.incidences = [];
        this.casesM1 = [];
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

    private loadDataIfRequired(): void {
        if (this.incidences.length === 0) {
            const dataItemM1 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 1);
            const dataItemM7 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 7);
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                this.incidences[ageGroup.getIndex()] = (this.getExposed(ageGroup.getName()) - dataItemM7.getExposed(ageGroup.getName())) * 100000 / ageGroup.getAbsValue();
                this.casesM1[ageGroup.getIndex()] = this.getExposed(ageGroup.getName()) - dataItemM1.getExposed(ageGroup.getName());
            });
            this.testsM7 = this.getTests() - dataItemM7.getTests();
        }
    }

    getIncidence(ageGroupIndex: number): number {
        this.loadDataIfRequired();
        return this.incidences[ageGroupIndex];
    }

    getTestsM7(): number {
        this.loadDataIfRequired();
        return this.testsM7;
    }

    getCasesM1(ageGroupIndex: number): number {
        this.loadDataIfRequired();
        return this.casesM1[ageGroupIndex];
    }

}
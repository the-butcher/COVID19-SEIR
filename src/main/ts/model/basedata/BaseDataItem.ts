import { Demographics } from './../../common/demographics/Demographics';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelConstants } from '../ModelConstants';
import { BaseData, IBaseDataItemConfig } from './BaseData';

export interface IBaseDataItem {
    getInstant(): number;
    getExposed(ageGroupName: string): number;
    getRemoved(ageGroupName: string): number;
    getVacc1(ageGroupName: string): number;
    getVacc2(ageGroupName: string): number;
    getTests(): number;
    getIncidence(ageGroupIndex: number): number;
    getTestsM7(): number;
    getCasesM1(ageGroupIndex: number): number;
    getAverage(ageGroupIndex: number): number;
}

export class BaseDataItem implements IBaseDataItem {

    private readonly instant: number;
    private readonly itemConfig: IBaseDataItemConfig;
    private readonly incidences: number[];
    private readonly averages: number[];
    private testsM7: number;
    private casesM1: number[];

    constructor(instant: number, itemConfig: IBaseDataItemConfig) {
        this.instant = instant;
        this.itemConfig = itemConfig;
        this.incidences = [];
        this.averages = [];
        this.casesM1 = [];
    }

    getInstant(): number {
        return this.instant;
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

            // console.log('load-data', new Date(this.instant));

            const dataItemM1 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 1);
            const dataItemM7 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 7);

            const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
            const dataItemP3 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 3);
            const dataItemP4 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 4);

            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                this.incidences[ageGroup.getIndex()] = (this.getExposed(ageGroup.getName()) - dataItemM7.getExposed(ageGroup.getName())) * 100000 / ageGroup.getAbsValue();
                this.casesM1[ageGroup.getIndex()] = this.getExposed(ageGroup.getName()) - dataItemM1.getExposed(ageGroup.getName());

                if (dataItemP2 && dataItemP3 && dataItemP4) {
                    const incidenceP2 = dataItemP2.getIncidence(ageGroup.getIndex());
                    const incidenceP3 = dataItemP3.getIncidence(ageGroup.getIndex());
                    const incidenceP4 = dataItemP4.getIncidence(ageGroup.getIndex());
                    if (incidenceP2 && incidenceP3 && incidenceP4) {
                        this.averages[ageGroup.getIndex()] = incidenceP2 * 0.25 + incidenceP3 * 0.50 + incidenceP4 * 0.25;
                    }
                }

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

    getAverage(ageGroupIndex: number): number {
        this.loadDataIfRequired();
        return this.averages[ageGroupIndex]; // * BaseData.getInstance().getAverageOffset(ageGroupIndex, new Date(this.instant).getDay());
    }

}
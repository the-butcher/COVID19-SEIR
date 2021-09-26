import { StrainUtil } from './../../util/StrainUtil';
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
    getPositivityRate(): number;
    getCasesM1(ageGroupIndex: number): number;
    getAverageCases(ageGroupIndex: number): number;
    getReproduceRate(ageGroupIndex: number): number;
    // getReproductionDerivate(ageGroupIndex: number): number;
}

export class BaseDataItem implements IBaseDataItem {

    private readonly instant: number;
    private readonly itemConfig: IBaseDataItemConfig;

    private readonly incidences: number[];
    private readonly averageCases: number[];

    private testsM7: number;
    private positivityRate: number;

    private casesM1: number[];
    private reproductionRates: number[];
    // private reproductionDerivates: number[];

    constructor(instant: number, itemConfig: IBaseDataItemConfig) {
        this.instant = instant;
        this.itemConfig = itemConfig;
        this.incidences = [];
        this.averageCases = [];
        this.casesM1 = [];
        this.reproductionRates = [];
        // this.reproductionDerivates = [];
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

    calculatePrimaryValues(): void {

        // console.log('load-data', new Date(this.instant));

        const dataItemM1 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 1);
        const dataItemM7 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 7);

        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            this.incidences[ageGroup.getIndex()] = (this.getExposed(ageGroup.getName()) - dataItemM7.getExposed(ageGroup.getName())) * 100000 / ageGroup.getAbsValue();
            this.casesM1[ageGroup.getIndex()] = this.getExposed(ageGroup.getName()) - dataItemM1.getExposed(ageGroup.getName());
        });
        this.testsM7 = (this.getTests() - dataItemM7.getTests());

    }

    calculateAverageValues(): void {

        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
        const dataItemP3 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 3);
        const dataItemP4 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 4);

        const ageGroupIndexTotal = Demographics.getInstance().getAgeGroups().length;
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            if (dataItemP2 && dataItemP3 && dataItemP4) {
                const incidenceP2 = dataItemP2.getIncidence(ageGroup.getIndex());
                const incidenceP3 = dataItemP3.getIncidence(ageGroup.getIndex());
                const incidenceP4 = dataItemP4.getIncidence(ageGroup.getIndex());
                if (incidenceP2 && incidenceP3 && incidenceP4) {
                    this.averageCases[ageGroup.getIndex()] = (incidenceP2 * 0.25 + incidenceP3 * 0.50 + incidenceP4 * 0.25) * ageGroup.getAbsValue() / 700000; // absolute number;
                }
            }

        });

        if (dataItemP2 && dataItemP3 && dataItemP4) {
            const testsP2 = dataItemP2.getTestsM7();
            const testsP3 = dataItemP3.getTestsM7();
            const testsP4 = dataItemP4.getTestsM7();
            if (testsP2 && testsP3 && testsP4) {
                const averageCases = this.averageCases[ageGroupIndexTotal];
                this.positivityRate =  (testsP2 * 0.25 + testsP3 * 0.50 + testsP4 * 0.25) / 7;
                this.positivityRate = averageCases * 10 / this.positivityRate;
            }
        }

    }

    calculateReproduceRatios(): void {

        const dataItemM2 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 2);
        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
        if (dataItemM2 && dataItemP2) {
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                const averageCasesM2 = dataItemM2.getAverageCases(ageGroup.getIndex());
                const averageCasesP2 = dataItemP2.getAverageCases(ageGroup.getIndex());
                if (averageCasesM2 && averageCasesP2) {
                    this.reproductionRates[ageGroup.getIndex()] = StrainUtil.calculateR0(averageCasesM2, averageCasesP2, dataItemM2.getInstant(), dataItemP2.getInstant(), 4);
                }
            });
        }

    }

    // calculateReproductionDerivates(): void {

    //     const dataItemM1 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 1);
    //     if (dataItemM1) {
    //         Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
    //             this.reproductionDerivates[ageGroup.getIndex()] = this.getReproductionRate(ageGroup.getIndex()) - dataItemM1.getReproductionRate(ageGroup.getIndex());
    //         });
    //     }

    // }

    // getReproductionDerivate(ageGroupIndex: number) {
    //     return this.reproductionDerivates[ageGroupIndex];
    // }

    getReproduceRate(ageGroupIndex: number) {
        return this.reproductionRates[ageGroupIndex];
    }

    getIncidence(ageGroupIndex: number): number {
        return this.incidences[ageGroupIndex];
    }

    getTestsM7(): number {
        return this.testsM7;
    }

    getPositivityRate(): number {
        return this.positivityRate;
    }

    getCasesM1(ageGroupIndex: number): number {
        return this.casesM1[ageGroupIndex];
    }

    getAverageCases(ageGroupIndex: number): number {
        return this.averageCases[ageGroupIndex];
    }

}
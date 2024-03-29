import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModelConstants } from '../ModelConstants';
import { Demographics } from './../../common/demographics/Demographics';
import { StrainUtil } from './../../util/StrainUtil';
import { TimeUtil } from './../../util/TimeUtil';
import { BaseData, IBaseDataItemConfig } from './BaseData';

export interface IBaseDataItem {

    getInstant(): number;

    calculateAverageValues(): void;
    calculatePrimaryValues(): void;

    getExposed(ageGroupName: string): number;
    getRemoved(ageGroupName: string): number;

    getVacc1(ageGroupName: string): number;
    getVacc2(ageGroupName: string): number;
    getVacc3(ageGroupName: string): number;
    getVacc4(ageGroupName: string): number;

    getTests(): number;
    getHospitalization(): number;
    getIcu(): number;
    getMobilityOther(): number;
    getMobilityWork(): number;
    getMobilityHome(): number;

    getIncidence(ageGroupIndex: number): number;

    getTestsM7(): number;
    getAverageTests(): number;
    getAveragePositivity(): number;
    getDerivedPositivity(): number;

    getCasesM1(ageGroupIndex: number): number;
    getCasesM6(ageGroupIndex: number): number;
    getCasesM7(ageGroupIndex: number): number;
    getAverageCases(ageGroupIndex: number): number;
    getAverageHelp1(ageGroupIndex: number): number;
    getAverageHelp2(ageGroupIndex: number): number;
    getReproduction(ageGroupIndex: number): number;
    getIcuM7(): number;

    setVariantShareDelta(variantShareDelta: number): void;
    getVariantShareDelta(ageGroupIndex: number): number;

    setVariantShareBA1(variantShareBA1: number): void;
    getVariantShareBA1(ageGroupIndex: number): number;

    setVariantShareBA2(variantShareBA2: number): void;
    getVariantShareBA2(ageGroupIndex: number): number;

    setVariantShareBA5(variantShareBA5: number): void;
    getVariantShareBA5(ageGroupIndex: number): number;

    setVariantShareB__(variantShareB__: number): void;
    getVariantShareB__(ageGroupIndex: number): number;

    extrapolateBaseDataItemConfig(): IBaseDataItemConfig;

}

export class BaseDataItem implements IBaseDataItem {

    private readonly instant: number;
    readonly itemConfig: IBaseDataItemConfig;

    private readonly incidences: number[];

    private testsM7: number;
    private averageTests: number;
    private averagePositivity: number;
    private derivedPositivity: number;

    private readonly casesM1: number[];
    private readonly casesM6: number[];
    private readonly casesM7: number[];
    private readonly averageCases: number[];
    private readonly averageHelp1: number[];
    private readonly averageHelp2: number[];
    private readonly reproductions: number[];

    private variantShareDelta: number;
    private variantShareBA1: number;
    private variantShareBA2: number;
    private variantShareBA5: number;
    private variantShareB__: number;

    constructor(instant: number, itemConfig: IBaseDataItemConfig) {
        this.instant = instant;
        this.itemConfig = itemConfig;
        this.incidences = [];
        this.averageCases = [];
        this.averageHelp1 = [];
        this.averageHelp2 = [];
        this.casesM1 = [];
        this.casesM6 = [];
        this.casesM7 = [];
        this.reproductions = [];
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
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST] > 0 ? this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST] : null;
    }

    getVacc2(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND] > 0 ? this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND] : null;
    }

    getVacc3(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC3RD] > 0 ? this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC3RD] : null;
    }

    getVacc4(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC4TH] > 0 ? this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC4TH] : null;
    }

    getTests(): number {
        return this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX___TESTS];
    }

    getHospitalization(): number {
        // const delayedItem = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 7);
        // if (delayedItem) {
        //     return (delayedItem as BaseDataItem).itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX____HOSP] * 850;
        // }
        return this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX____HOSP];
    }

    getIcu(): number {
        return this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX_____ICU];
    }

    getMobilityOther(): number {
        const configValue = this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX__MOBI_O];
        return configValue >= 0 ? configValue / 100 : undefined;
    }

    getMobilityWork(): number {
        const configValue = this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX__MOBI_W];
        return configValue >= 0 ? configValue / 100 : undefined;
    }

    getMobilityHome(): number {
        const configValue = this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX__MOBI_H];
        return configValue >= 0 ? configValue / 100 : undefined;
    }

    /**
     * calculate case-incidence and test-incidence
     */
    calculatePrimaryValues(): void {

        // console.log('load-data', new Date(this.instant));

        const dataItemM1 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 1);
        const dataItemM6 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 6);
        const dataItemM7 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 7);

        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            this.casesM1[ageGroup.getIndex()] = this.getExposed(ageGroup.getName()) - dataItemM1.getExposed(ageGroup.getName());
            this.casesM6[ageGroup.getIndex()] = this.getExposed(ageGroup.getName()) - dataItemM6.getExposed(ageGroup.getName());
            this.casesM7[ageGroup.getIndex()] = this.getExposed(ageGroup.getName()) - dataItemM7.getExposed(ageGroup.getName());
            this.incidences[ageGroup.getIndex()] = this.casesM7[ageGroup.getIndex()] * 100000 / ageGroup.getAbsValue();
        });
        this.testsM7 = (this.getTests() - dataItemM7.getTests());

    }

    extrapolateBaseDataItemConfig(): IBaseDataItemConfig {

        // look ahead 2,3
        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
        const dataItemP3 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 3);
        if (dataItemP2 && dataItemP3) {

            const dataItemM1 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 1);
            const dataItemM7 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 7);
            const dataItemM8 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 8);

            const baseDateItemConfig: IBaseDataItemConfig = {};
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                /**
                 * find ratios for 1 and 8 to have an idea how it developed over the week
                 */
                const averageHelp1M1 = dataItemM1.getAverageHelp1(ageGroup.getIndex());
                const averageHelp2M1 = dataItemM1.getAverageHelp2(ageGroup.getIndex());
                const ratioHelpM1 = averageHelp1M1 / averageHelp2M1;

                const averageHelp1M8 = dataItemM8.getAverageHelp1(ageGroup.getIndex());
                const averageHelp2M8 = dataItemM8.getAverageHelp2(ageGroup.getIndex());
                const ratioHelpM8 = averageHelp1M8 / averageHelp2M8;
                const ratioHelpM81 = ratioHelpM8 / ratioHelpM1;

                /**
                 * apply the 1-8 ratio to the ratio 7 days ago
                 */
                const averageHelp1M7 = dataItemM7.getAverageHelp1(ageGroup.getIndex());
                const averageHelp2M7 = dataItemM7.getAverageHelp2(ageGroup.getIndex());
                const ratioHelpM7 = averageHelp1M7 / averageHelp2M7;

                const ratioHelp00 = ratioHelpM7 / ratioHelpM81;

                baseDateItemConfig[ageGroup.getName()] = [dataItemP3.getExposed(ageGroup.getName()) + this.averageHelp1[ageGroup.getIndex()] * 4 / ratioHelp00];

            });

            return baseDateItemConfig;

        }

    }

    calculateAverageValues(): void {

        // look ahead 2,3 and 4 items and from their respective incidence build average values
        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
        const dataItemP3 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 3);
        const dataItemP4 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 4);

        if (dataItemP2 && dataItemP3) {

            const ageGroupIndexTotal = Demographics.getInstance().getAgeGroups().length;
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                const casesP2 = dataItemP2.getCasesM7(ageGroup.getIndex());
                const casesP3 = dataItemP3.getCasesM7(ageGroup.getIndex());

                this.averageHelp1[ageGroup.getIndex()] = casesP2 * 0.25 + casesP3 * 0.50 + dataItemP3.getCasesM6(ageGroup.getIndex()) * 0.25;

                if (dataItemP4) {
                    const casesP4 = dataItemP4.getCasesM7(ageGroup.getIndex());
                    this.averageCases[ageGroup.getIndex()] = (casesP2 * 0.25 + casesP3 * 0.50 + casesP4 * 0.25) / 7;
                    this.averageHelp2[ageGroup.getIndex()] = dataItemP4.getCasesM1(ageGroup.getIndex()) * 0.25;
                }

            });

            if (dataItemP4) {

                const testsP2 = dataItemP2.getTestsM7();
                const testsP3 = dataItemP3.getTestsM7();
                const testsP4 = dataItemP4.getTestsM7();
                if (testsP2 && testsP3 && testsP4) {
                    const averageCases = this.averageCases[ageGroupIndexTotal];
                    let _averageTests = (testsP2 * 0.25 + testsP3 * 0.50 + testsP4 * 0.25) / 7;
                    if (!Number.isNaN(_averageTests)) {
                        this.averageTests = _averageTests;
                        this.averagePositivity = averageCases / _averageTests;
                    }
                }
            }

        }

    }

    calculateAverageDerivates(): void {

        const dataItemM2 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 2);
        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
        if (dataItemM2 && dataItemP2) {

            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                const averageCasesM2 = dataItemM2.getAverageCases(ageGroup.getIndex());
                const averageCasesP2 = dataItemP2.getAverageCases(ageGroup.getIndex());
                if (averageCasesM2 && averageCasesP2) {
                    this.reproductions[ageGroup.getIndex()] = StrainUtil.calculateR0(averageCasesM2, averageCasesP2, dataItemM2.getInstant(), dataItemP2.getInstant(), 4);
                }
            });

            const averagePositivityM2 = dataItemM2.getAveragePositivity();
            const averagePositivityP2 = dataItemP2.getAveragePositivity();
            if (averagePositivityM2 && averagePositivityP2) {
                const _derivedPositivity = StrainUtil.calculateR0(averagePositivityM2, averagePositivityP2, dataItemM2.getInstant(), dataItemP2.getInstant(), 4);
                if (!Number.isNaN(_derivedPositivity)) {
                    this.derivedPositivity = _derivedPositivity;
                }
            }

        }

    }

    getIncidence(ageGroupIndex: number): number {
        return this.incidences[ageGroupIndex];
    }


    getTestsM7(): number {
        return this.testsM7;
    }

    getAveragePositivity(): number {
        return this.averagePositivity;
    }

    getAverageTests(): number {
        return this.averageTests;
    }

    getDerivedPositivity(): number {
        return this.derivedPositivity;
    }

    getCasesM1(ageGroupIndex: number): number {
        return this.casesM1[ageGroupIndex];
    }

    getCasesM6(ageGroupIndex: number): number {
        return this.casesM6[ageGroupIndex];
    }

    getCasesM7(ageGroupIndex: number): number {
        return this.casesM7[ageGroupIndex];
    }

    getIcuM7(): number {
        const dataItemP21 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 21);
        const dataItemM14 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 14);
        if (dataItemP21 && dataItemM14) {
            return dataItemP21.getIcu() - dataItemM14.getIcu();
        }
    }

    getAverageCases(ageGroupIndex: number): number {
        return this.averageCases[ageGroupIndex];
    }

    getAverageHelp1(ageGroupIndex: number): number {
        return this.averageHelp1[ageGroupIndex];
    }

    getAverageHelp2(ageGroupIndex: number): number {
        return this.averageHelp2[ageGroupIndex];
    }

    getReproduction(ageGroupIndex: number) {
        return this.reproductions[ageGroupIndex];
    }

    setVariantShareDelta(variantShareDelta: number): void {
        this.variantShareDelta = variantShareDelta;
    }

    getVariantShareDelta(ageGroupIndex: number): number {
        if (ageGroupIndex == Demographics.getInstance().getAgeGroupTotal().getIndex() && this.variantShareDelta) {
            return this.variantShareDelta * this.getAverageCases(ageGroupIndex);
        }
    }


    setVariantShareBA1(variantShareBA1: number): void {
        this.variantShareBA1 = variantShareBA1;
    }

    getVariantShareBA1(ageGroupIndex: number): number {
        if (ageGroupIndex == Demographics.getInstance().getAgeGroupTotal().getIndex() && this.variantShareBA1) {
            return this.variantShareBA1 * this.getAverageCases(ageGroupIndex);
        }
    }

    setVariantShareBA2(variantShareBA2: number): void {
        this.variantShareBA2 = variantShareBA2;
    }

    getVariantShareBA2(ageGroupIndex: number): number {
        if (ageGroupIndex == Demographics.getInstance().getAgeGroupTotal().getIndex() && this.variantShareBA2) {
            return this.variantShareBA2 * this.getAverageCases(ageGroupIndex);
        }
    }

    setVariantShareBA5(variantShareBA5: number): void {
        this.variantShareBA5 = variantShareBA5;
    }

    getVariantShareBA5(ageGroupIndex: number): number {
        if (ageGroupIndex == Demographics.getInstance().getAgeGroupTotal().getIndex() && this.variantShareBA5) {
            return this.variantShareBA5 * this.getAverageCases(ageGroupIndex);
        }
    }

    setVariantShareB__(variantShareB__: number): void {
        this.variantShareB__ = variantShareB__;
    }

    getVariantShareB__(ageGroupIndex: number): number {
        if (ageGroupIndex == Demographics.getInstance().getAgeGroupTotal().getIndex() && this.variantShareB__) {
            return this.variantShareB__ * this.getAverageCases(ageGroupIndex);
        }
    }


}
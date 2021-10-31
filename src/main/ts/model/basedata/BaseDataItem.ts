import { StrainUtil } from './../../util/StrainUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelConstants } from '../ModelConstants';
import { BaseData, IBaseDataItemConfig } from './BaseData';
import regression, { DataPoint } from 'regression';
import { DataParser } from '@amcharts/amcharts4/core';

export interface IBaseDataItem {

    getInstant(): number;

    getExposed(ageGroupName: string): number;
    getRemoved(ageGroupName: string): number;
    getVacc1(ageGroupName: string): number;
    getVacc2(ageGroupName: string): number;
    getTests(): number;
    getMobilityOther(): number;
    getMobilityWork(): number;
    getMobilityHome(): number;

    getIncidence(ageGroupIndex: number): number;

    getTestsM7(): number;
    getAveragePositivity(): number;
    getDerivedPositivity(): number;

    getCasesM1(ageGroupIndex: number): number;
    getAverageCases(ageGroupIndex: number): number;
    getReproduction(ageGroupIndex: number): number;

    getAverageMobilityOther(): number;
    getAverageMobilityWork(): number;
    getAverageMobilityHome(): number;

}

export class BaseDataItem implements IBaseDataItem {

    private readonly instant: number;
    private readonly itemConfig: IBaseDataItemConfig;

    private readonly incidences: number[];

    private testsM7: number;
    private averagePositivity: number;
    private derivedPositivity: number;

    private readonly casesM1: number[];
    private readonly averageCases: number[];
    private readonly reproductions: number[];

    private averageMobilityOther: number;
    private averageMobilityWork: number;
    private averageMobilityHome: number;


    constructor(instant: number, itemConfig: IBaseDataItemConfig) {
        this.instant = instant;
        this.itemConfig = itemConfig;
        this.incidences = [];
        this.averageCases = [];
        this.casesM1 = [];
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
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
    }

    getVacc2(ageGroupName: string): number {
        return this.itemConfig[ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
    }

    getTests(): number {
        return this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX___TESTS];
    }

    getMobilityOther(): number {
        const configValue = this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX__MOBI_O];
        return configValue >=0 ? configValue / 120 : undefined;
    }

    getMobilityWork(): number {
        const configValue = this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX__MOBI_W];
        return configValue >=0 ? configValue / 120 : undefined;
    }

    getMobilityHome(): number {
        const configValue = this.itemConfig[ModelConstants.AGEGROUP_NAME_______ALL][ModelConstants.BASE_DATA_INDEX__MOBI_H];
        return configValue >=0 ? configValue / 120 : undefined;
    }

    /**
     * calculate case-incidence and test-incidence
     */
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

        // look ahead 2,3 and 4 items and from their respective incidence build average values
        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 2);
        const dataItemP3 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 3);
        const dataItemP4 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 4);

        if (dataItemP2 && dataItemP3) { //  && dataItemP3 && dataItemP4

            const ageGroupIndexTotal = Demographics.getInstance().getAgeGroups().length;
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                const incidenceP2 = dataItemP2.getIncidence(ageGroup.getIndex());
                const incidenceP3 = dataItemP3.getIncidence(ageGroup.getIndex());
                if (dataItemP4) {
                    const incidenceP4 = dataItemP4.getIncidence(ageGroup.getIndex());
                    this.averageCases[ageGroup.getIndex()] = (incidenceP2 * 0.25 + incidenceP3 * 0.50 + incidenceP4 * 0.25) * ageGroup.getAbsValue() / 700000;
                } else {
                    this.averageCases[ageGroup.getIndex()] = incidenceP3 * ageGroup.getAbsValue() / 700000;
                }
            });

            if (dataItemP4) {
                const testsP2 = dataItemP2.getTestsM7();
                const testsP3 = dataItemP3.getTestsM7();
                const testsP4 = dataItemP4.getTestsM7();
                if (testsP2 && testsP3 && testsP4) {
                    const averageCases = this.averageCases[ageGroupIndexTotal];
                    let _averagePositivity =  (testsP2 * 0.25 + testsP3 * 0.50 + testsP4 * 0.25) / 7;
                    _averagePositivity = averageCases / _averagePositivity;
                    if (!Number.isNaN(_averagePositivity)) {
                        this.averagePositivity = _averagePositivity;
                    }
                }
            }

            let mobilityOtherValues: number[] = [];
            let mobilityWorkValues: number[] = [];
            let mobilityHomeValues: number[] = [];

            mobilityOtherValues.push(this.getMobilityOther());
            mobilityWorkValues.push(this.getMobilityWork());
            mobilityHomeValues.push(this.getMobilityHome());

            const dataItemMI = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY);
            const dataItemPI = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY);
            if (dataItemMI.getMobilityOther() && dataItemPI.getMobilityOther()) {
                mobilityOtherValues.push(dataItemMI.getMobilityOther());
                mobilityOtherValues.push(dataItemPI.getMobilityOther());
            }
            if (dataItemMI.getMobilityWork() && dataItemPI.getMobilityWork()) {
                mobilityWorkValues.push(dataItemMI.getMobilityWork());
                mobilityWorkValues.push(dataItemPI.getMobilityWork());
            }
            if (dataItemMI.getMobilityHome() && dataItemPI.getMobilityHome()) {
                mobilityHomeValues.push(dataItemMI.getMobilityHome());
                mobilityHomeValues.push(dataItemPI.getMobilityHome());
            }

            mobilityOtherValues.sort((a, b) => a - b);
            mobilityWorkValues.sort((a, b) => a - b);
            mobilityHomeValues.sort((a, b) => a - b);

            this.averageMobilityOther = mobilityOtherValues.reduce((a, b) => a + b, 0) /  mobilityOtherValues.length;
            this.averageMobilityWork = mobilityWorkValues.reduce((a, b) => a + b, 0) / mobilityWorkValues.length;
            this.averageMobilityHome = mobilityHomeValues.reduce((a, b) => a + b, 0) / mobilityHomeValues.length;

        }

    }

    calculateAverageDerivates(): void {

        const dataItemM2 = BaseData.getInstance().findBaseDataItem(this.instant - TimeUtil.MILLISECONDS_PER____DAY * 0);
        const dataItemP2 = BaseData.getInstance().findBaseDataItem(this.instant + TimeUtil.MILLISECONDS_PER____DAY * 1);
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

    getAverageMobilityOther(): number {
        return this.averageMobilityOther;
    }

    getAverageMobilityWork(): number {
        return this.averageMobilityWork;
    }

    getAverageMobilityHome(): number {
        return this.averageMobilityHome;
    }

    getAveragePositivity(): number {
        return this.averagePositivity;
    }

    getDerivedPositivity(): number {
        return this.derivedPositivity;
    }

    getCasesM1(ageGroupIndex: number): number {
        return this.casesM1[ageGroupIndex];
    }

    getAverageCases(ageGroupIndex: number): number {
        return this.averageCases[ageGroupIndex];
    }

    getReproduction(ageGroupIndex: number) {
        return this.reproductions[ageGroupIndex];
    }

}
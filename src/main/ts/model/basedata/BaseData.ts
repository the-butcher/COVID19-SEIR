import { StrainUtil } from './../../util/StrainUtil';
import { DouglasPeucker } from './../../util/DouglasPeucker';
import { JsonLoader } from '../../util/JsonLoader';
import { Demographics } from './../../common/demographics/Demographics';
import { Statistics } from './../../util/Statistics';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelInstants } from './../ModelInstants';
import { BaseDataItem, IBaseDataItem } from './BaseDataItem';

export interface IBaseDataMarker {
    instant: number,
    derived: number,
    display: number
}
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

    private static instance: BaseData;

    private readonly path: string;
    private readonly baseDataset: {[K: string]: IBaseDataItemConfig};
    private readonly baseDataItems: {[K: string]: IBaseDataItem};

    // private readonly reproductionInstants: number[];
    // private readonly positivityInstants: number[];

    /**
     * a set of averages by age-group and week day
     */
    private readonly dailyOffsets: Statistics[][];

    constructor(path: string, baseDataset: {[K: string]: IBaseDataItemConfig}) {
        this.path = path;
        this.baseDataset = baseDataset;
        this.baseDataItems = {};
        this.dailyOffsets = [];
        // this.reproductionInstants = [];
        // this.positivityInstants = [];
    }

    getPath(): string {
        return this.path;
    }

    getBaseDataConfig(): IBaseDataConfig {
        return this.baseDataset;
    }

    findBaseDataItem(instant: number): IBaseDataItem {
        const normalizedInstant = instant - instant % TimeUtil.MILLISECONDS_PER____DAY;
        return this.baseDataItems[normalizedInstant] || this.buildBaseDataItem(normalizedInstant);
    }

    // isReproductionInstant(instant: number): boolean {
    //     return this.reproductionInstants.includes(instant);
    // }

    // isPositivityInstant(instant: number): boolean {
    //     return this.positivityInstants.includes(instant);
    // }

    calculateDailyStats(): void {

        const instantPre = ModelInstants.getInstance().getPreInstant();
        const instantMax = ModelInstants.getInstance().getMaxInstant();

        // setup containers for daily offsets
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            this.dailyOffsets[ageGroup.getIndex()] = [];
            for (let i=0; i<7; i++) {
                this.dailyOffsets[ageGroup.getIndex()][i] = new Statistics();
            }
        });

        const instantMin = instantPre; // - TimeUtil.MILLISECONDS_PER___WEEK * 5;
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                (dataItem as BaseDataItem).calculatePrimaryValues();
            }
        }

        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                (dataItem as BaseDataItem).calculateAverageValues();
            }
        }

        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                (dataItem as BaseDataItem).calculateAverageDerivates();
            }
        }

        const reproductionMarkers: IBaseDataMarker[] = [];
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                const value = dataItem.getReproductionNumber(Demographics.getInstance().getAgeGroups().length);
                if (value && !Number.isNaN(value)) {
                    reproductionMarkers.push({
                        instant,
                        derived: value,
                        display: value
                    });
                }
            }
        }
        const reproductionIndices = new DouglasPeucker(reproductionMarkers).findIndices();
        reproductionIndices.forEach(reproductionIndex => {
            const reproductionMarker = reproductionMarkers[reproductionIndex];
            // console.log('reproductionMarker', TimeUtil.formatCategoryDate(reproductionMarker.instant), reproductionMarker.derived);
        });

        // testing does not
        let positivityMarkers: IBaseDataMarker[] = [];
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                const value = dataItem.getDerivedPositivity();
                if (value && !Number.isNaN(value)) {
                    positivityMarkers.push({
                        instant,
                        derived: value,
                        display: dataItem.getAveragePositivity()
                    });
                }
            }
        }
        const positivityIndices = new DouglasPeucker(positivityMarkers).findIndices();
        positivityIndices.forEach(positivityIndex => {
            const positivityMarker = positivityMarkers[positivityIndex];
            // TODO use some base settings here to map 0.33 to 0.05
            console.log('positivityMarker', TimeUtil.formatCategoryDate(positivityMarker.instant), StrainUtil.calculateDiscoveryRate(0.33, 0.10, positivityMarker.display));
        });

        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {

            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {

                const day = new Date(dataItem.getInstant()).getDay();
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                    const average = dataItem.getAverageCases(ageGroup.getIndex()) * ageGroup.getAbsValue() / 700000;
                    const cases = dataItem.getCasesM1(ageGroup.getIndex());

                    // add to proper age-group / day stats instance
                    if (average) {
                        const avgToCaseRatio = cases / average;
                        this.dailyOffsets[ageGroup.getIndex()][day].addValue(avgToCaseRatio);
                    }

                });

            }

        }

    }

    getAverageOffset(ageGroupIndex: number, day: number): number {
        return this.dailyOffsets[ageGroupIndex][day].getAverage();
    }

    private buildBaseDataItem(instant: number): IBaseDataItem {
        const categoryX = TimeUtil.formatCategoryDate(instant);
        const baseDataItemConfig = this.baseDataset[categoryX];
        if (baseDataItemConfig) {
            this.baseDataItems[instant] = new BaseDataItem(instant, baseDataItemConfig);
            return this.baseDataItems[instant];
        } else {
            return undefined;
        }
    }

}
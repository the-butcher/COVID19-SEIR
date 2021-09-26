import { DouglasPeucker } from './../../util/DouglasPeucker';
import { JsonLoader } from '../../util/JsonLoader';
import { Demographics } from './../../common/demographics/Demographics';
import { Statistics } from './../../util/Statistics';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelInstants } from './../ModelInstants';
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

    private static instance: BaseData;

    private readonly path: string;
    private readonly baseDataset: {[K: string]: IBaseDataItemConfig};
    private readonly baseDataItems: {[K: string]: IBaseDataItem};

    private readonly reproduceInstants: number[];
    private readonly discoveryInstants: number[];

    /**
     * a set of averages by age-group and week day
     */
    private readonly dailyOffsets: Statistics[][];

    constructor(path: string, baseDataset: {[K: string]: IBaseDataItemConfig}) {
        this.path = path;
        this.baseDataset = baseDataset;
        this.baseDataItems = {};
        this.dailyOffsets = [];
        this.reproduceInstants = [];
        this.discoveryInstants = [];
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

    isReproduceInstant(instant: number): boolean {
        return this.reproduceInstants.includes(instant);
    }

    isDiscoveryInstant(instant: number): boolean {
        return this.discoveryInstants.includes(instant);
    }

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
                (dataItem as BaseDataItem).calculateReproduceRatios();
            }
        }

        const reproduceValues: number[] = [];
        const reproduceInstants: number[] = [];
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                const reproduceValue = dataItem.getReproduceRate(Demographics.getInstance().getAgeGroups().length);
                if (reproduceValue && !Number.isNaN(reproduceValue)) {
                    reproduceInstants.push(instant);
                    reproduceValues.push(reproduceValue);
                }
            }
        }
        const reproduceIndices = new DouglasPeucker(reproduceValues).findIndices();
        reproduceIndices.forEach(reproduceIndex => {
            this.reproduceInstants.push(reproduceInstants[reproduceIndex]);
        });
        console.log('reproduceInstants', this.reproduceInstants);

        const discoveryValues: number[] = [];
        const discoveryInstants: number[] = [];
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                const discoveryValue = dataItem.getPositivityRate();
                if (discoveryValue && !Number.isNaN(discoveryValue)) {
                    discoveryInstants.push(instant);
                    discoveryValues.push(discoveryValue);
                }
            }
        }
        const discoveryIndices = new DouglasPeucker(discoveryValues).findIndices();
        discoveryIndices.forEach(discoveryIndex => {
            this.discoveryInstants.push(discoveryInstants[discoveryIndex]);
        });
        console.log('discoveryInstants', this.reproduceInstants);


        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {

            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {

                const day = new Date(dataItem.getInstant()).getDay();
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                    // incidence = cases * 100000 / pop
                    // incidence * pop = cases * 100000
                    // cases = incidence * pop / 100000

                    const average = dataItem.getAverageCases(ageGroup.getIndex()) * ageGroup.getAbsValue() / 700000;
                    const cases = dataItem.getCasesM1(ageGroup.getIndex());

                    // add to proper age-group / day stats instance
                    if (average) {
                        // console.log(ageGroup.getName(), new Date(dataItem.getInstant()), average, cases)
                        const avgToCaseRatio = cases / average;
                        this.dailyOffsets[ageGroup.getIndex()][day].addValue(avgToCaseRatio);

                    }

                });

            }

        }

        // Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
        //     for (let i=0; i<7; i++) {
        //         console.log(ageGroup.getName(), i, this.dailyOffsets[ageGroup.getIndex()][i]);
        //     }
        // });

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
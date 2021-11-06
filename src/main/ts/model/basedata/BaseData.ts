import { ModificationContact } from './../../common/modification/ModificationContact';
import { Modifications } from '../../common/modification/Modifications';
import { JsonLoader } from '../../util/JsonLoader';
import { Demographics } from './../../common/demographics/Demographics';
import { DouglasPeucker } from './../../util/DouglasPeucker';
import { ObjectUtil } from './../../util/ObjectUtil';
import { Statistics } from './../../util/Statistics';
import { StrainUtil } from './../../util/StrainUtil';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelInstants } from './../ModelInstants';
import { BaseDataItem, IBaseDataItem } from './BaseDataItem';
import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';

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
    private dailyOffsetInstantMin: number;
    private dailyOffsetInstantMax: number;

    /**
     * a set of averages by age-group and week day
     */
    private readonly dailyOffsets: Statistics[][];

    constructor(path: string, baseDataset: {[K: string]: IBaseDataItemConfig}) {
        this.path = path;
        this.baseDataset = baseDataset;
        this.baseDataItems = {};
        this.dailyOffsets = [];
        this.dailyOffsetInstantMin = -1;
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


    calculateDailyStats(): void {

        const instantPre = ModelInstants.getInstance().getPreInstant();
        const instantMax = ModelInstants.getInstance().getMaxInstant();

        /**
         * setup containers for daily offsets
         */
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

        /**
         * fill daily stats
         */
        for (let instant = instantMax; instant > instantMin; instant -= TimeUtil.MILLISECONDS_PER____DAY) {

            const dataItem = this.findBaseDataItem(instant);

            // keep setting offset limit until a data item is found
            if (dataItem) {

                if (instant > this.dailyOffsetInstantMin) {

                    const day = new Date(dataItem.getInstant()).getDay();
                    Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                        const average = dataItem.getAverageCases(ageGroup.getIndex());
                        const cases = dataItem.getCasesM1(ageGroup.getIndex());

                        // add to proper age-group / day stats instance
                        if (average) {
                            const avgToCaseRatio = cases / average;
                            this.dailyOffsets[ageGroup.getIndex()][day].addValue(avgToCaseRatio);
                        }

                    });

                }

            } else {
                this.dailyOffsetInstantMin = instant - TimeUtil.MILLISECONDS_PER___WEEK * 5;
                this.dailyOffsetInstantMax = instant + TimeUtil.MILLISECONDS_PER___WEEK;
            }

        }

        const reproductionMarkers: IBaseDataMarker[] = [];
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant);
            if (dataItem) {
                const value = dataItem.getReproduction(Demographics.getInstance().getAgeGroups().length);
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
            const id = ObjectUtil.createId();
            const contactCategories = Demographics.getInstance().getCategories();
            const multipliers: { [k: string]: number} = {}
            contactCategories.forEach(contactCategory => {
                multipliers[contactCategory.getName()] = 0.1;
            });
            multipliers['school'] = 0.4;
            multipliers['nursing'] = 0.5;
            multipliers['family'] = BaseData.getInstance().findBaseDataItem(reproductionMarker.instant).getAverageMobilityHome() * 0.60;
            multipliers['work'] = BaseData.getInstance().findBaseDataItem(reproductionMarker.instant).getAverageMobilityWork() * 0.60;
            multipliers['other'] = BaseData.getInstance().findBaseDataItem(reproductionMarker.instant).getAverageMobilityOther() * 0.60;

            if (reproductionMarker.instant > ModelInstants.getInstance().getMinInstant()) {

                // Modifications.getInstance().addModification(new ModificationContact({
                //     id,
                //     key: 'CONTACT',
                //     name: `adjustments (${id})`,
                //     instant: reproductionMarker.instant,
                //     multipliers,
                //     deletable: true,
                //     draggable: true,
                //     blendable: false
                // }));

            }



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
            const overall = StrainUtil.calculateDiscoveryRate(0.33, 0.10, positivityMarker.display);
            const id = ObjectUtil.createId();
            const contactCategories = Demographics.getInstance().getCategories();
            const multipliers: { [k: string]: number} = {}
            contactCategories.forEach(contactCategory => {
                multipliers[contactCategory.getName()] = overall;
            });
            multipliers['school'] = 0.5;
            multipliers['nursing'] = 0.5;
            multipliers['family'] = 0.5;
            multipliers['work'] = 0.2;
            multipliers['other'] = 0.2;

            // if (positivityMarker.instant > ModelInstants.getInstance().getMinInstant()) {
            if (positivityMarker.instant > new Date('2021-10-16').getTime()) {

                // console.log('adding at', TimeUtil.formatCategoryDate(positivityMarker.instant));

                // Modifications.getInstance().addModification(new ModificationDiscovery({
                //     id,
                //     key: 'TESTING',
                //     name: `adjustments (${id})`,
                //     instant: positivityMarker.instant,
                //     bindToOverall: true,
                //     overall,
                //     multipliers,
                //     deletable: true,
                //     draggable: true,
                //     blendable: true
                // }));

            }

        });

    }

    getAverageOffset(ageGroupIndex: number, instant: number): number | undefined {
        if (instant > this.dailyOffsetInstantMin && instant <= this.dailyOffsetInstantMax) {
            return this.dailyOffsets[ageGroupIndex][new Date(instant).getDay()].getAverage();
        }
    }

    private buildBaseDataItem(instant: number): IBaseDataItem {
        const categoryX = TimeUtil.formatCategoryDateFull(instant);
        const baseDataItemConfig = this.baseDataset[categoryX];
        if (baseDataItemConfig) {
            this.baseDataItems[instant] = new BaseDataItem(instant, baseDataItemConfig);
            return this.baseDataItems[instant];
        } else {
            return undefined;
        }
    }

}
import { JsonLoader } from '../../util/JsonLoader';
import { Demographics } from './../../common/demographics/Demographics';
import { Statistics } from './../../util/Statistics';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelInstants } from './../ModelInstants';
import { BaseDataItem, IBaseDataItem } from './BaseDataItem';


export interface IBaseDataMarker {
    instant: number,
    derived: number,
    display: number,
    avgTest?: number
}
export interface IBaseDataConfig {
    [K: string]: IBaseDataItemConfig;
}

export interface IBaseDataItemConfig {

    /**
     * age-group key, and age group data
     */
    [K: string]: number[];

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
    static setInstanceFromConfig(path: string, baseDataset: { [K: string]: IBaseDataItemConfig }): void {
        this.instance = new BaseData(path, baseDataset);
    }

    static getInstance(): BaseData {
        return this.instance;
    }

    private static instance: BaseData;

    private readonly path: string;
    private readonly baseDataset: { [K: string]: IBaseDataItemConfig };
    private readonly baseDataItems: { [K: string]: IBaseDataItem };
    private lastValidInstant: number;
    private dailyOffsetInstantMin: number;
    private dailyOffsetInstantMax: number;

    /**
     * a set of averages by age-group and week day
     */
    private readonly dailyOffsets: Statistics[][];

    constructor(path: string, baseDataset: { [K: string]: IBaseDataItemConfig }) {
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

    findBaseDataItem(instant: number, allowExtrapolation?: boolean): IBaseDataItem {
        const normalizedInstant = instant - instant % TimeUtil.MILLISECONDS_PER____DAY;
        const dataItem = this.baseDataItems[normalizedInstant] || this.buildBaseDataItem(normalizedInstant, allowExtrapolation);
        if (!dataItem) {
            Math.random();
        }
        return dataItem;
    }

    getLastValidInstant(): number {
        return this.lastValidInstant;
    }


    calculateDailyStats(): void {

        const instantPre = ModelInstants.getInstance().getPreInstant();
        const instantMax = ModelInstants.getInstance().getMaxInstant();

        /**
         * setup containers for daily offsets
         */
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            this.dailyOffsets[ageGroup.getIndex()] = [];
            for (let i = 0; i < 7; i++) {
                this.dailyOffsets[ageGroup.getIndex()][i] = new Statistics();
            }
        });

        const instantMin = instantPre; // - TimeUtil.MILLISECONDS_PER___WEEK * 5;
        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant, false);
            if (dataItem) {
                (dataItem as BaseDataItem).calculatePrimaryValues();
                this.lastValidInstant = dataItem.getInstant();
            }
        }

        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant, false);
            if (dataItem) {
                (dataItem as BaseDataItem).calculateAverageValues();
            }
        }

        for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            const dataItem = this.findBaseDataItem(instant, false);
            if (dataItem) {
                (dataItem as BaseDataItem).calculateAverageDerivates();
            }
        }

        /**
         * fill daily stats
         */
        for (let instant = instantMax; instant > instantMin; instant -= TimeUtil.MILLISECONDS_PER____DAY) {

            const dataItem = this.findBaseDataItem(instant, false);

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

        // const reproductionMarkers: IBaseDataMarker[] = [];
        // for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
        //     const dataItem = this.findBaseDataItem(instant, false);
        //     if (dataItem) {
        //         const value = dataItem.getReproduction(Demographics.getInstance().getAgeGroups().length);
        //         if (value && !Number.isNaN(value)) {
        //             reproductionMarkers.push({
        //                 instant,
        //                 derived: value,
        //                 display: value
        //             });
        //         }
        //     }
        // }
        // const reproductionIndices = new DouglasPeucker(reproductionMarkers).findIndices();
        // reproductionIndices.forEach(reproductionIndex => {

        //     const reproductionMarker = reproductionMarkers[reproductionIndex];
        //     const id = ObjectUtil.createId();
        //     const contactCategories = Demographics.getInstance().getCategories();
        //     const multipliers: { [k: string]: number } = {}
        //     contactCategories.forEach(contactCategory => {
        //         multipliers[contactCategory.getName()] = 0.1;
        //     });
        //     multipliers['school'] = 0.4;
        //     multipliers['nursing'] = 0.5;
        //     multipliers['family'] = BaseData.getInstance().findBaseDataItem(reproductionMarker.instant, false).getAverageMobilityHome() * 0.60;
        //     multipliers['work'] = BaseData.getInstance().findBaseDataItem(reproductionMarker.instant, false).getAverageMobilityWork() * 0.60;
        //     multipliers['other'] = BaseData.getInstance().findBaseDataItem(reproductionMarker.instant, false).getAverageMobilityOther() * 0.60;

        //     if (reproductionMarker.instant > ModelInstants.getInstance().getMinInstant()) {

        //         console.log('adding at', TimeUtil.formatCategoryDateFull(reproductionMarker.instant));

        //         // Modifications.getInstance().addModification(new ModificationContact({
        //         //     id,
        //         //     key: 'CONTACT',
        //         //     name: `adjustments (${id})`,
        //         //     instant: reproductionMarker.instant,
        //         //     multipliers,
        //         //     deletable: true,
        //         //     draggable: true,
        //         //     blendable: false
        //         // }));

        //     }

        // });



        //     // console.log('reproductionMarker', TimeUtil.formatCategoryDate(reproductionMarker.instant), reproductionMarker.derived);
        // });

        // // testing does not
        // let positivityMarkers: IBaseDataMarker[] = [];
        // for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
        //     const dataItem = this.findBaseDataItem(instant, false);
        //     if (dataItem) {
        //         const value = dataItem.getDerivedPositivity();
        //         if (value && !Number.isNaN(value)) {
        //             positivityMarkers.push({
        //                 instant,
        //                 derived: value,
        //                 display: dataItem.getAveragePositivity(),
        //                 avgTest: dataItem.getAverageTests() / Demographics.getInstance().getAbsTotal()
        //             });
        //         }
        //     }
        // }
        // const positivityIndices = new DouglasPeucker(positivityMarkers).findIndices();
        // positivityIndices.forEach(positivityIndex => {

        //     const positivityMarker = positivityMarkers[positivityIndex];
        //     // const modifications = Modifications.getInstance();
        //     const overall = ModificationSettings.getInstance().calculateDiscoveryRate(positivityMarker.display, positivityMarker.avgTest);
        //     const contactCategories = Demographics.getInstance().getCategories();
        //     const multipliers: { [k: string]: number } = {}
        //     contactCategories.forEach(contactCategory => {
        //         multipliers[contactCategory.getName()] = overall;
        //     });
        //     multipliers['school'] = 0.4;
        //     multipliers['nursing'] = 0.75;
        //     multipliers['family'] = 0.6;
        //     multipliers['work'] = 0.2;
        //     multipliers['other'] = 0.2;

        //     // if (positivityMarker.instant > ModelInstants.getInstance().getMinInstant()) {
        //     const id = ObjectUtil.createId();
        //     if (positivityMarker.instant > new Date('2022-03-28').getTime()) {

        //         // console.log('adding at', TimeUtil.formatCategoryDateFull(positivityMarker.instant));

        //         // Modifications.getInstance().addModification(new ModificationDiscovery({
        //         //     id,
        //         //     key: 'TESTING',
        //         //     name: `adjustments (${id})`,
        //         //     instant: positivityMarker.instant,
        //         //     bindToOverall: true,
        //         //     overall,
        //         //     multipliers,
        //         //     deletable: true,
        //         //     draggable: true,
        //         //     blendable: true
        //         // }));

        //     }

        // });

        // const deletableInstants: string[] = [];
        // for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
        //     let dataItem = this.findBaseDataItem(instant, false);
        //     if (!dataItem) {
        //         dataItem = this.findBaseDataItem(instant, true);
        //         if (dataItem) {
        //             deletableInstants.push(instant.toString());
        //         }
        //     }
        // }
        // deletableInstants.forEach(instant => {
        //     delete this.baseDataItems[instant];
        // })

        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("05.01.2022")).setVariantShareDelta(0.267803);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("12.01.2022")).setVariantShareDelta(0.142427);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("19.01.2022")).setVariantShareDelta(0.025075);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("26.01.2022")).setVariantShareDelta(0.015045);

        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("05.01.2022")).setVariantShareBA1(0.718154);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("12.01.2022")).setVariantShareBA1(0.813440);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("19.01.2022")).setVariantShareBA1(0.898696);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("26.01.2022")).setVariantShareBA1(0.858576);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("02.02.2022")).setVariantShareBA1(0.830491);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("09.02.2022")).setVariantShareBA1(0.705115);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("16.02.2022")).setVariantShareBA1(0.685055);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("23.02.2022")).setVariantShareBA1(0.607823);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("02.03.2022")).setVariantShareBA1(0.421264);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("09.03.2022")).setVariantShareBA1(0.315948);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("16.03.2022")).setVariantShareBA1(0.187563);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("23.03.2022")).setVariantShareBA1(0.165496);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("30.03.2022")).setVariantShareBA1(0.095286);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("06.04.2022")).setVariantShareBA1(0.062187);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("13.04.2022")).setVariantShareBA1(0.162487);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("20.04.2022")).setVariantShareBA1(0.020060);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("27.04.2022")).setVariantShareBA1(0.015045);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("04.05.2022")).setVariantShareBA1(0.007021);

        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("05.01.2022")).setVariantShareBA2(0.014042);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("12.01.2022")).setVariantShareBA2(0.044132);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("19.01.2022")).setVariantShareBA2(0.076229);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("26.01.2022")).setVariantShareBA2(0.126379);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("02.02.2022")).setVariantShareBA2(0.169509);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("09.02.2022")).setVariantShareBA2(0.294885);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("16.02.2022")).setVariantShareBA2(0.314945);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("23.02.2022")).setVariantShareBA2(0.392177);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("02.03.2022")).setVariantShareBA2(0.578736);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("09.03.2022")).setVariantShareBA2(0.684052);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("16.03.2022")).setVariantShareBA2(0.812437);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("23.03.2022")).setVariantShareBA2(0.834504);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("30.03.2022")).setVariantShareBA2(0.904714);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("06.04.2022")).setVariantShareBA2(0.937813);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("13.04.2022")).setVariantShareBA2(0.837513);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("20.04.2022")).setVariantShareBA2(0.976931);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("27.04.2022")).setVariantShareBA2(0.981946);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("04.05.2022")).setVariantShareBA2(0.977934);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("11.05.2022")).setVariantShareBA2(0.964895);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("18.05.2022")).setVariantShareBA2(0.937813);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("25.05.2022")).setVariantShareBA2(0.812437);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("01.06.2022")).setVariantShareBA2(0.580742);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("08.06.2022")).setVariantShareBA2(0.429288);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("15.06.2022")).setVariantShareBA2(0.255767);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("22.06.2022")).setVariantShareBA2(0.149448);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("29.06.2022")).setVariantShareBA2(0.080241);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("06.07.2022")).setVariantShareBA2(0.045135);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("13.07.2022")).setVariantShareBA2(0.028084);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("20.07.2022")).setVariantShareBA2(0.011033);

        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("04.05.2022")).setVariantShareBA5(0.015045);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("11.05.2022")).setVariantShareBA5(0.033099);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("18.05.2022")).setVariantShareBA5(0.060181);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("25.05.2022")).setVariantShareBA5(0.185557);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("01.06.2022")).setVariantShareBA5(0.417252);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("08.06.2022")).setVariantShareBA5(0.568706);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("15.06.2022")).setVariantShareBA5(0.742227);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("22.06.2022")).setVariantShareBA5(0.848546);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("29.06.2022")).setVariantShareBA5(0.917753);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("06.07.2022")).setVariantShareBA5(0.952859);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("13.07.2022")).setVariantShareBA5(0.969910);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("20.07.2022")).setVariantShareBA5(0.987964);

        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("15.06.2022")).setVariantShareB__(0.000001);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("31.08.2022")).setVariantShareB__(0.12);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("21.09.2022")).setVariantShareB__(0.19);
        this.findBaseDataItem(TimeUtil.parseCategoryDateFull("28.09.2022")).setVariantShareB__(0.26);
        // this.findBaseDataItem(TimeUtil.parseCategoryDateFull("05.10.2022")).setVariantShareB__(0.33);


    }

    getAverageOffset(ageGroupIndex: number, instant: number): number | undefined {
        if (instant > this.dailyOffsetInstantMin && instant <= this.dailyOffsetInstantMax) {
            return this.dailyOffsets[ageGroupIndex][new Date(instant).getDay()].getAverage();
        }
    }

    private buildBaseDataItem(instant: number, allowExtrapolation?: boolean): IBaseDataItem {
        const categoryX = TimeUtil.formatCategoryDateFull(instant);
        const baseDataItemConfig = this.baseDataset[categoryX];
        if (baseDataItemConfig) {
            this.baseDataItems[instant] = new BaseDataItem(instant, baseDataItemConfig);
            return this.baseDataItems[instant];
        } else if (allowExtrapolation) {

            // build a hypothetical "P4" item
            const dataItemM4 = BaseData.getInstance().findBaseDataItem(instant - TimeUtil.MILLISECONDS_PER____DAY * 4, false);
            if (dataItemM4) {

                const baseDataItemConfig: IBaseDataItemConfig = dataItemM4.extrapolateBaseDataItemConfig();
                if (baseDataItemConfig) {
                    // console.log(TimeUtil.formatCategoryDateFull(instant), 'missing config, using m4 config for help', baseDataItemConfig);
                    // this.baseDataItems[instant]
                    const dataItem00 = new BaseDataItem(instant, baseDataItemConfig);
                    dataItem00.calculatePrimaryValues();
                    this.baseDataItems[instant] = dataItem00; // have the item ready for retrieval

                    // should now be possible to calculate that item's average values
                    dataItemM4.calculateAverageValues();

                    const dataItemM3 = BaseData.getInstance().findBaseDataItem(instant - TimeUtil.MILLISECONDS_PER____DAY * 3, false);
                    dataItemM3.calculateAverageValues();

                    return this.baseDataItems[instant];

                }

            }
            return undefined;

        }
    }

}
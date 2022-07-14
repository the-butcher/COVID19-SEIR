import { IModificationValuesDiscovery } from '../../common/modification/IModificationValuesDiscovery';
import { Modifications } from '../../common/modification/Modifications';
import { ModificationSettings } from '../../common/modification/ModificationSettings';
import { TimeUtil } from '../../util/TimeUtil';
import { BaseData } from '../basedata/BaseData';
import { CompartmentFilter } from '../compartment/CompartmentFilter';
import { ECompartmentType } from '../compartment/ECompartmentType';
import { ModelConstants } from '../ModelConstants';
import { ModelImplRoot } from '../ModelImplRoot';
import { Demographics } from './../../common/demographics/Demographics';
import { IModificationValuesContact } from './../../common/modification/IModificationValuesContact';
import { IModificationValuesRegression } from './../../common/modification/IModificationValuesRegression';
import { IModificationValuesStrain } from './../../common/modification/IModificationValuesStrain';
import { ModificationTime } from './../../common/modification/ModificationTime';
import { StrainUtil } from './../../util/StrainUtil';
import { ModelInstants } from './../ModelInstants';
import { IModelState } from './IModelState';
import { ModelState } from './ModelState';

/**
 * definition for a type that hold model progress and, if complete, model data
 */
export interface IModelProgress {
    ratio: number;
    calibratedStrains?: IModificationValuesStrain[];
    data?: IDataItem[];
    modificationValuesRegression?: IModificationValuesRegression;
    modificationValuesContact?: IModificationValuesContact[];
    modificationValuesDiscovery?: IModificationValuesDiscovery[];
    fitterParams?: IFitterParams;
}

export interface IFitterParams {
    maxErrorTolerance: number;
    curErrorCalculate: number;
    currDateCalculate?: string;
}

export interface IDataForecast {
    avg: number;
    std: number;
    num: number;
}

export interface IDataItem {
    instant: number;
    categoryX: string;
    valueset: { [K: string]: IDataValues };
    exposure: number[][];
    testRate: number;
    positivityRate: number;
    errors?: { [K: string]: number };
    derivs?: { [K: string]: number };
}
export interface IDataValues {
    SUSCEPTIBLE: number;
    REMOVED_VI: number;
    REMOVED_V2: number;
    CASES: { [K in string]: number };
    INCIDENCES: { [K in string]: number };
    PREDICTION?: IDataForecast;
    EXPOSED: { [K in string]: number };
    INFECTIOUS: { [K in string]: number };
    REMOVED: { [K in string]: number };
    REPRODUCTION?: { [K in string]: number };
    DISCOVERY: number;
    TOTAL: number;
}


/**
 * performs an euler-integration in 1 hour steps on a model-state
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ModelStateIntegrator {

    static readonly DT = TimeUtil.MILLISECONDS_PER____DAY / 24;

    private readonly model: ModelImplRoot;
    private logInstant: number;
    private curInstant: number;

    private modelState: IModelState;
    private exposure: number[][];

    private rollbackInstant: number;
    private rollbackState: IModelState;


    constructor(model: ModelImplRoot, curInstant: number) {
        this.model = model;
        this.curInstant = curInstant;
        this.logInstant = curInstant;
        this.modelState = model.getInitialState();
        this.resetExposure(); // be sure the exposure matrix is in a clean state upon init
    }

    private integrate(dT: number, tT: number): ModificationTime {

        const modificationTime = ModificationTime.createInstance(tT);

        if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0 && tT > BaseData.getInstance().getLastValidInstant() - TimeUtil.MILLISECONDS_PER____DAY * 4) {

            const compartmentFilterCasesTotal = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0);
            const discoveredCases = this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * this.model.getAbsTotal();

            const testRate = modificationTime.getTestRate();
            const positivityRateCandidate = StrainUtil.calculatePositivityRate(discoveredCases, testRate);
            modificationTime.injectPositivityRate(positivityRateCandidate);

        }

        this.modelState.add(this.model.apply(this.modelState, dT, tT, modificationTime));



        return modificationTime;

    }

    getInstant(): number {
        return this.curInstant;
    }

    getModelState(): IModelState {
        return this.modelState;
    }

    resetExposure(): void {
        this.exposure = [];
        for (let indexContact = 0; indexContact < this.model.getDemographics().getAgeGroups().length; indexContact++) {
            this.exposure[indexContact] = [];
            for (let indexParticipant = 0; indexParticipant < this.model.getDemographics().getAgeGroups().length; indexParticipant++) {
                this.exposure[indexContact][indexParticipant] = 0.0;
            }
        }
    }

    checkpoint(): void {
        this.rollbackInstant = this.curInstant;
        this.rollbackState = ModelState.copy(this.modelState);
    }

    rollback(): void {
        this.curInstant = this.rollbackInstant;
        this.modelState = this.rollbackState;
    }

    async emptyModelData(dstInstant: number, dataFilter: (curInstant: number) => boolean, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataSet: IDataItem[] = [];

        const minChartInstant = ModelInstants.getInstance().getMinInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        for (; this.curInstant <= dstInstant; this.curInstant += ModelStateIntegrator.DT) {

            const modificationTime = this.integrate(ModelStateIntegrator.DT, this.curInstant);

            if (dataFilter(this.curInstant)) {

                const cases: { [K: string]: number } = {};
                const incidences: { [K: string]: number } = {};
                const exposed: { [K: string]: number } = {};
                const infectious: { [K: string]: number } = {};
                const removed: { [K: string]: number } = {};
                const reproduction: { [K: string]: number } = {};

                modificationValuesStrain.forEach(modificationValueStrain => {
                    cases[modificationValueStrain.id] = undefined;
                    incidences[modificationValueStrain.id] = undefined;
                    exposed[modificationValueStrain.id] = undefined;
                    infectious[modificationValueStrain.id] = undefined;
                    removed[modificationValueStrain.id] = undefined;
                    reproduction[modificationValueStrain.id] = undefined;
                });

                const dataItem: IDataItem = {
                    instant: this.curInstant,
                    categoryX: TimeUtil.formatCategoryDateFull(this.curInstant),
                    valueset: {},
                    exposure: this.exposure,
                    testRate: modificationTime.getTestRate(),
                    positivityRate: modificationTime.getPositivityRate(),
                };
                dataItem.valueset[ModelConstants.AGEGROUP_NAME_______ALL] = {
                    CASES: cases,
                    SUSCEPTIBLE: undefined,
                    REMOVED_VI: undefined,
                    REMOVED_V2: undefined,
                    INCIDENCES: incidences,
                    EXPOSED: exposed,
                    INFECTIOUS: infectious,
                    REMOVED: removed,
                    TOTAL: undefined,
                    DISCOVERY: undefined,
                    REPRODUCTION: reproduction
                };

                this.model.getDemographics().getAgeGroups().forEach(ageGroup => {

                    dataItem.valueset[ageGroup.getName()] = {
                        CASES: cases,
                        SUSCEPTIBLE: undefined,
                        REMOVED_VI: undefined,
                        REMOVED_V2: undefined,
                        INCIDENCES: incidences,
                        EXPOSED: exposed,
                        INFECTIOUS: infectious,
                        REMOVED: removed,
                        TOTAL: undefined,
                        DISCOVERY: undefined,
                        REPRODUCTION: reproduction
                    };

                });

                dataSet.push(dataItem);

            }

            progressCallback({
                ratio: (this.curInstant - minChartInstant) / (maxChartInstant - minChartInstant)
            });

        }

        // console.log('model-state', this.modelState.toJSON());
        progressCallback({
            ratio: (this.curInstant - minChartInstant) / (maxChartInstant - minChartInstant),
            data: dataSet
        });

        return dataSet;

    }

    async buildModelData(dstInstant: number, dataFilter: (curInstant: number) => boolean, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataSet: IDataItem[] = [];
        const absTotal = this.model.getDemographics().getAbsTotal();
        const ageGroupIndexTotal = this.model.getDemographics().getAgeGroupTotal().getIndex();

        const minChartInstant = ModelInstants.getInstance().getMinInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        // one time evaluation of strains contributing
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        for (; this.curInstant <= dstInstant; this.curInstant += ModelStateIntegrator.DT) {

            // perform a single model integration step
            const modificationTime = this.integrate(ModelStateIntegrator.DT, this.curInstant);

            // sum up strain exposures to a single exposure matrix
            modificationValuesStrain.forEach(modificationValueStrain => {
                const strainModel = this.model.findStrainModel(modificationValueStrain.id);
                const strainExposure = strainModel.getNrmExposure();
                for (let indexContact = 0; indexContact < strainExposure.length; indexContact++) {
                    for (let indexParticipant = 0; indexParticipant < strainExposure.length; indexParticipant++) {
                        this.exposure[indexContact][indexParticipant] += strainExposure[indexContact][indexParticipant];
                    }
                }
            });

            if (dataFilter(this.curInstant)) {

                const compartmentFilterSusceptibleTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.S__SUSCEPTIBLE));
                const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E______EXPOSED));
                const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I___INFECTIOUS));
                const compartmentFilterRemovedIDTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R____RECOVERED));
                const compartmentFilterRemovedVITotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___IMMUNIZING));
                const compartmentFilterRemovedV2Total = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___VACCINATED));
                const compartmentFilterCasesTotal = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0);
                const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N));
                const compartmentFilterModelTotal = new CompartmentFilter(c => (c.getCompartmentType() !== ECompartmentType.X__INCIDENCE_0 && c.getCompartmentType() !== ECompartmentType.X__INCIDENCE_N));

                // const removedIDTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedIDTotal);
                const removedVITotal = this.modelState.getNrmValueSum(compartmentFilterRemovedVITotal);
                const removedV2Total = this.modelState.getNrmValueSum(compartmentFilterRemovedV2Total);

                // TODO DISCOVERY :: with discovery moved to strain, find a way to get an overall discovery ratio (try: count discoveredcases in strain iteration)
                // const discoveryTotal = modificationTime.getDiscoveryRatesRaw(ageGroupIndexTotal).discovery;
                const discoveryTotal = modificationTime.getDiscoveryRateLoess(ageGroupIndexTotal);

                // values that come by strain
                const cases: { [K: string]: number } = {};
                const incidences: { [K: string]: number } = {};
                const exposed: { [K: string]: number } = {};
                const infectious: { [K: string]: number } = {};
                const removed: { [K: string]: number } = {};
                const reproduction: { [K: string]: number } = {};

                cases[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * absTotal;
                incidences[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * absTotal * 100000 / absTotal;
                exposed[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterExposedTotal);
                infectious[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);
                removed[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterRemovedIDTotal);

                // let casesTotal = 0;
                // let discoTotal = 0;
                modificationValuesStrain.forEach(modificationValueStrain => {

                    const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E______EXPOSED) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I___INFECTIOUS) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterCasesStrain = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterRemovedIDTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R____RECOVERED && c.getStrainId() === modificationValueStrain.id));

                    cases[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterCasesStrain) * absTotal;
                    incidences[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * 100000;
                    exposed[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterExposedTotal);
                    infectious[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);
                    infectious[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);
                    removed[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterRemovedIDTotal);

                    // casesTotal += this.modelState.getNrmValueSum(compartmentFilterCasesStrain);

                });
                // console.log(TimeUtil.formatCategoryDateFull(this.curInstant), this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * absTotal, casesTotal * absTotal);

                const dataItem: IDataItem = {
                    instant: this.curInstant,
                    categoryX: TimeUtil.formatCategoryDateFull(this.curInstant),
                    valueset: {},
                    exposure: this.exposure,
                    testRate: modificationTime.getTestRate(),
                    positivityRate: modificationTime.getPositivityRate(),
                };
                dataItem.valueset[ModelConstants.AGEGROUP_NAME_______ALL] = {
                    CASES: cases,
                    SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptibleTotal),
                    REMOVED_VI: removedVITotal,
                    REMOVED_V2: removedV2Total,
                    INCIDENCES: incidences,
                    EXPOSED: exposed,
                    REMOVED: removed,
                    INFECTIOUS: infectious,
                    TOTAL: this.modelState.getNrmValueSum(compartmentFilterModelTotal) * absTotal,
                    DISCOVERY: discoveryTotal,
                    REPRODUCTION: reproduction
                };

                this.model.getDemographics().getAgeGroups().forEach(ageGroup => {

                    const groupNormalizer = absTotal / ageGroup.getAbsValue();

                    const compartmentFilterSusceptible = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.S__SUSCEPTIBLE && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterExposed = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.E______EXPOSED && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterInfectious = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.I___INFECTIOUS && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedID = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R____RECOVERED) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedVI = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___IMMUNIZING) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedV2 = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___VACCINATED) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterCases = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterAgeGroupTotal = new CompartmentFilter(c => (c.getCompartmentType() !== ECompartmentType.X__INCIDENCE_0 && c.getCompartmentType() !== ECompartmentType.X__INCIDENCE_N) && c.getAgeGroupIndex() === ageGroup.getIndex());

                    // const removedID = this.modelState.getNrmValueSum(compartmentFilterRemovedID) * groupNormalizer;
                    const removedVI = this.modelState.getNrmValueSum(compartmentFilterRemovedVI) * groupNormalizer;
                    const removedV2 = this.modelState.getNrmValueSum(compartmentFilterRemovedV2) * groupNormalizer;

                    // TODO DISCOVERY :: with discovery moved to strain, find a way to get an overall discovery ratio (try: count discoveredcases in strain iteration)
                    // const discovery = modificationTime.getDiscoveryRatesRaw(ageGroup.getIndex()).discovery;
                    const discovery = modificationTime.getDiscoveryRateLoess(ageGroup.getIndex());

                    const casesAgeGroup: { [K: string]: number } = {};
                    const incidencesAgeGroup: { [K: string]: number } = {};
                    const exposedAgeGroup: { [K: string]: number } = {};
                    const infectiousAgeGroup: { [K: string]: number } = {};
                    const removedAgeGroup: { [K: string]: number } = {};
                    const reproductionAgeGroup: { [K: string]: number } = {};

                    casesAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterCases) * absTotal;
                    incidencesAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                    exposedAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer;
                    infectiousAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer;
                    removedAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterRemovedID) * groupNormalizer;

                    modificationValuesStrain.forEach(modificationValueStrain => {

                        const compartmentFilterCases = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterExposed = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E______EXPOSED) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterInfectious = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I___INFECTIOUS) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterRmoved = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R____RECOVERED) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);

                        casesAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterCases) * absTotal;
                        incidencesAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                        exposedAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer;
                        infectiousAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer;
                        removedAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterRmoved) * groupNormalizer;

                    });
                    dataItem.valueset[ageGroup.getName()] = {
                        CASES: casesAgeGroup,
                        SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptible) * groupNormalizer,
                        REMOVED_VI: removedVI,
                        REMOVED_V2: removedV2,
                        INCIDENCES: incidencesAgeGroup,
                        EXPOSED: exposedAgeGroup,
                        INFECTIOUS: infectiousAgeGroup,
                        REMOVED: removedAgeGroup,
                        TOTAL: this.modelState.getNrmValueSum(compartmentFilterAgeGroupTotal) * groupNormalizer,
                        DISCOVERY: discovery,
                        REPRODUCTION: reproductionAgeGroup
                    };

                    // if (ageGroup.getName() === '>= 85') {
                    //     console.log('>= 85', this.modelState.getNrmValueSum(compartmentFilterAgeGroupTotal) * absTotal);
                    // }


                });

                // console.log('total', TimeUtil.formatCategoryDateFull(this.curInstant), this.modelState.getNrmValueSum(compartmentFilterModelTotal) * absTotal);

                this.resetExposure();

                dataSet.push(dataItem);

            }

            progressCallback({
                ratio: (this.curInstant - minChartInstant) / (maxChartInstant - minChartInstant)
            });

        }

        // console.log('model-state', this.modelState.toJSON());
        progressCallback({
            ratio: (this.curInstant - minChartInstant) / (maxChartInstant - minChartInstant),
            data: dataSet
        });

        return dataSet;

    }

    static addReproduction(dataSet: IDataItem[]): void {
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);
        for (let i = 2; i < dataSet.length - 2; i++) {
            const dataItemM2 = dataSet[i - 2];
            const dataItemP2 = dataSet[i + 2];
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                const averageCasesM2 = dataItemM2.valueset[ageGroup.getName()].CASES[ModelConstants.STRAIN_ID___________ALL];
                const averageCasesP2 = dataItemP2.valueset[ageGroup.getName()].CASES[ModelConstants.STRAIN_ID___________ALL];
                dataSet[i].valueset[ageGroup.getName()].REPRODUCTION[ModelConstants.STRAIN_ID___________ALL] = StrainUtil.calculateR0(averageCasesM2, averageCasesP2, dataItemM2.instant, dataItemP2.instant, 4);
                modificationValuesStrain.forEach(modificationValueStrain => {
                    const averageCasesM2 = dataItemM2.valueset[ageGroup.getName()].CASES[modificationValueStrain.id];
                    const averageCasesP2 = dataItemP2.valueset[ageGroup.getName()].CASES[modificationValueStrain.id];
                    dataSet[i].valueset[ageGroup.getName()].REPRODUCTION[modificationValueStrain.id] = StrainUtil.calculateR0(averageCasesM2, averageCasesP2, dataItemM2.instant, dataItemP2.instant, 4);
                });
            });
        }
    }

}
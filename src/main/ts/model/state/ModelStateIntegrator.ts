import { Modifications } from '../../common/modification/Modifications';
import { TimeUtil } from '../../util/TimeUtil';
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
    seasonality: number;
    errors?: { [K: string]: number };
    derivs?: { [K: string]: number };
}
export interface IDataValues {
    SUSCEPTIBLE: number;
    REMOVED_ID: number;
    // REMOVED_IU: number;
    REMOVED_VI: number;
    // REMOVED_VU: number;
    REMOVED_V2: number;
    CASES: number;
    INCIDENCES: { [K in string]: number };
    PREDICTION?: IDataForecast;
    EXPOSED: { [K in string]: number };
    INFECTIOUS: { [K in string]: number };
    REPRODUCTION?: number;
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

                const incidences: { [K: string]: number } = {};
                const exposed: { [K: string]: number } = {};
                const infectious: { [K: string]: number } = {};
                modificationValuesStrain.forEach(modificationValueStrain => {
                    incidences[modificationValueStrain.id] = undefined;
                    exposed[modificationValueStrain.id] = undefined;
                    infectious[modificationValueStrain.id] = undefined;
                });

                const dataItem: IDataItem = {
                    instant: this.curInstant,
                    categoryX: TimeUtil.formatCategoryDateFull(this.curInstant),
                    valueset: {},
                    exposure: this.exposure,
                    seasonality: modificationTime.getSeasonality()
                };
                dataItem.valueset[ModelConstants.AGEGROUP_NAME_______ALL] = {
                    SUSCEPTIBLE: undefined,
                    REMOVED_ID: undefined,
                    // REMOVED_IU: undefined,
                    REMOVED_VI: undefined,
                    // REMOVED_VU: undefined,
                    REMOVED_V2: undefined,
                    CASES: undefined,
                    INCIDENCES: incidences,
                    EXPOSED: exposed,
                    INFECTIOUS: infectious,
                    TOTAL: undefined,
                    DISCOVERY: undefined
                };

                this.model.getDemographics().getAgeGroups().forEach(ageGroup => {

                    dataItem.valueset[ageGroup.getName()] = {
                        SUSCEPTIBLE: undefined,
                        REMOVED_ID: undefined,
                        // REMOVED_IU: undefined,
                        REMOVED_VI: undefined,
                        // REMOVED_VU: undefined,
                        REMOVED_V2: undefined,
                        CASES: undefined,
                        INCIDENCES: incidences,
                        EXPOSED: exposed,
                        INFECTIOUS: infectious,
                        TOTAL: undefined,
                        DISCOVERY: undefined
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

        // this.rollbackInstant = this.curInstant;
        // this.rollbackState = ModelState.copy(this.modelState);

        const dataSet: IDataItem[] = [];
        const absTotal = this.model.getDemographics().getAbsTotal();

        const minChartInstant = ModelInstants.getInstance().getMinInstant();
        const maxChartInstant = ModelInstants.getInstance().getMaxInstant();

        // const compartmentFilterRemovedVInit = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___REMOVED_V));
        // console.log('v-init', this.modelState.getNrmValueSum(compartmentFilterRemovedVInit));

        // one time evaluation of strains contributing
        const modificationValuesStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m.getModificationValues() as IModificationValuesStrain);

        const compartmentFilterSusceptibleTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.S__SUSCEPTIBLE));
        const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E______EXPOSED));
        const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I___INFECTIOUS));
        const compartmentFilterRemovedIDTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R____RECOVERED));
        const compartmentFilterRemovedVITotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___IMMUNIZING));
        const compartmentFilterRemovedV2Total = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R___VACCINATED));
        const compartmentFilterCasesTotal = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0);
        const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N));
        const compartmentFilterModelTotal = new CompartmentFilter(c => (c.getCompartmentType() !== ECompartmentType.X__INCIDENCE_0 && c.getCompartmentType() !== ECompartmentType.X__INCIDENCE_N));

        for (; this.curInstant <= dstInstant; this.curInstant += ModelStateIntegrator.DT) {

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

                const removedIDTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedIDTotal);
                const removedVITotal = this.modelState.getNrmValueSum(compartmentFilterRemovedVITotal);
                const removedV2Total = this.modelState.getNrmValueSum(compartmentFilterRemovedV2Total);
                const discoveryTotal = modificationTime.getDiscoveryRatioTotal();

                // values that come by strain
                const incidences: { [K: string]: number } = {};
                const exposed: { [K: string]: number } = {};
                const infectious: { [K: string]: number } = {};

                incidences[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * absTotal * 100000 / absTotal;
                exposed[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterExposedTotal);
                infectious[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);

                modificationValuesStrain.forEach(modificationValueStrain => {

                    const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E______EXPOSED) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I___INFECTIOUS) && c.getStrainId() === modificationValueStrain.id);

                    incidences[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * 100000;
                    exposed[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterExposedTotal);
                    infectious[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);

                });

                const dataItem: IDataItem = {
                    instant: this.curInstant,
                    categoryX: TimeUtil.formatCategoryDateFull(this.curInstant),
                    valueset: {},
                    exposure: this.exposure,
                    seasonality: modificationTime.getSeasonality()
                };
                dataItem.valueset[ModelConstants.AGEGROUP_NAME_______ALL] = {
                    SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptibleTotal),
                    REMOVED_ID: removedIDTotal,
                    // REMOVED_IU: removedIUTotal,
                    REMOVED_VI: removedVITotal,
                    // REMOVED_VU: removedVUTotal,
                    REMOVED_V2: removedV2Total,
                    CASES: this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * absTotal,
                    INCIDENCES: incidences,
                    EXPOSED: exposed,
                    INFECTIOUS: infectious,
                    TOTAL: this.modelState.getNrmValueSum(compartmentFilterModelTotal) * absTotal,
                    DISCOVERY: discoveryTotal
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

                    const removedID = this.modelState.getNrmValueSum(compartmentFilterRemovedID) * groupNormalizer;
                    const removedVI = this.modelState.getNrmValueSum(compartmentFilterRemovedVI) * groupNormalizer;
                    const removedV2 = this.modelState.getNrmValueSum(compartmentFilterRemovedV2) * groupNormalizer;
                    const discovery = modificationTime.getDiscoveryRatios(ageGroup.getIndex()).discovery;

                    const incidencesAgeGroup: { [K: string]: number } = {};
                    const exposedAgeGroup: { [K: string]: number } = {};
                    const infectiousAgeGroup: { [K: string]: number } = {};

                    incidencesAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                    exposedAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer;
                    infectiousAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer;

                    modificationValuesStrain.forEach(modificationValueStrain => {

                        const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCIDENCE_0 || c.getCompartmentType() === ECompartmentType.X__INCIDENCE_N) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterExposed = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E______EXPOSED) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterInfectious = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I___INFECTIOUS) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);

                        incidencesAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                        exposedAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer;
                        infectiousAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer;

                    });
                    dataItem.valueset[ageGroup.getName()] = {
                        SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptible) * groupNormalizer,
                        REMOVED_ID: removedID,
                        REMOVED_VI: removedVI,
                        REMOVED_V2: removedV2,
                        CASES: this.modelState.getNrmValueSum(compartmentFilterCases) * absTotal,
                        INCIDENCES: incidencesAgeGroup,
                        EXPOSED: exposedAgeGroup,
                        INFECTIOUS: infectiousAgeGroup,
                        TOTAL: this.modelState.getNrmValueSum(compartmentFilterAgeGroupTotal) * groupNormalizer,
                        DISCOVERY: discovery
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
        for (let i = 2; i < dataSet.length - 2; i++) {
            const dataItemM2 = dataSet[i - 2];
            const dataItemP2 = dataSet[i + 2];
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                const averageCasesM2 = dataItemM2.valueset[ageGroup.getName()].CASES;
                const averageCasesP2 = dataItemP2.valueset[ageGroup.getName()].CASES;
                dataSet[i].valueset[ageGroup.getName()].REPRODUCTION = StrainUtil.calculateR0(averageCasesM2, averageCasesP2, dataItemM2.instant, dataItemP2.instant, 4);
            });
        }
    }

}
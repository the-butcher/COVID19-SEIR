import { Modifications } from '../../common/modification/Modifications';
import { TimeUtil } from '../../util/TimeUtil';
import { CompartmentFilter } from '../compartment/CompartmentFilter';
import { ECompartmentType } from '../compartment/ECompartmentType';
import { ModelConstants } from '../ModelConstants';
import { ModelImplRoot } from '../ModelImplRoot';
import { IModificationValuesContact } from './../../common/modification/IModificationValuesContact';
import { IModificationValuesStrain } from './../../common/modification/IModificationValuesStrain';
import { ModificationTime } from './../../common/modification/ModificationTime';
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
    modificationValuesContact?: IModificationValuesContact[];
    fitterParams?: IFitterParams;
}

export interface IFitterParams {
    derivRatio: number;
    errorTLast: number;
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
    REMOVED_IU: number;
    REMOVED_V1: number;
    REMOVED_V2: number;
    REMOVED_VR: number;
    REMOVED_VC: number;
    CASES: number;
    INCIDENCES: { [K: string]: number };
    EXPOSED: { [K: string]: number };
    INFECTIOUS: { [K: string]: number };
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

        const compartmentFilterSusceptibleTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.S_SUSCEPTIBLE));
        const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E_____EXPOSED));
        const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I__INFECTIOUS));
        const compartmentFilterRemovedIDTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_ID));
        const compartmentFilterRemovedIUTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_IU));
        const compartmentFilterRemovedV1Total = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_VI));
        const compartmentFilterRemovedVRTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_VU));
        const compartmentFilterRemovedV2Total = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_V2));
        const compartmentFilterRemovedVCTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__REMOVED_VC));
        const compartmentFilterCasesTotal = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCUBATE_0);
        const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N));
        const compartmentFilterModelTotal = new CompartmentFilter(c => (c.getCompartmentType() !== ECompartmentType.X__INCUBATE_0 && c.getCompartmentType() !== ECompartmentType.X__INCUBATE_N && c.getCompartmentType() !== ECompartmentType.X__REMOVED_VC));

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
                const removedIUTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedIUTotal);
                const removedV1Total = this.modelState.getNrmValueSum(compartmentFilterRemovedV1Total);
                const removedVRTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedVRTotal);
                const removedV2Total = this.modelState.getNrmValueSum(compartmentFilterRemovedV2Total);
                const removedVCTotal = this.modelState.getNrmValueSum(compartmentFilterRemovedVCTotal);
                const discoveryTotal = modificationTime.getDiscoveryRatioTotal();

                // values that come by strain
                const incidences: {[K: string]: number} = {};
                const exposed: {[K: string]: number} = {};
                const infectious: {[K: string]: number} = {};

                incidences[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * absTotal * 100000 / absTotal;
                exposed[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterExposedTotal);
                infectious[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);

                modificationValuesStrain.forEach(modificationValueStrain => {

                    const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterExposedTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E_____EXPOSED) && c.getStrainId() === modificationValueStrain.id);
                    const compartmentFilterInfectiousTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I__INFECTIOUS) && c.getStrainId() === modificationValueStrain.id);

                    incidences[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * 100000;
                    exposed[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterExposedTotal);
                    infectious[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectiousTotal);

                });

                const dataItem: IDataItem = {
                    instant: this.curInstant,
                    categoryX: TimeUtil.formatCategoryDate(this.curInstant),
                    valueset: {},
                    exposure: this.exposure,
                    seasonality: modificationTime.getSeasonality()
                };
                dataItem.valueset[ModelConstants.AGEGROUP_NAME_______ALL] = {
                    SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptibleTotal),
                    REMOVED_ID: removedIDTotal,
                    REMOVED_IU: removedIUTotal,
                    REMOVED_V1: removedV1Total,
                    REMOVED_VR: removedVRTotal,
                    REMOVED_V2: removedV2Total,
                    REMOVED_VC: removedVCTotal,
                    CASES: this.modelState.getNrmValueSum(compartmentFilterCasesTotal) * absTotal,
                    INCIDENCES: incidences,
                    EXPOSED: exposed,
                    INFECTIOUS: infectious,
                    TOTAL: this.modelState.getNrmValueSum(compartmentFilterModelTotal) * absTotal,
                    DISCOVERY: discoveryTotal
                };

                this.model.getDemographics().getAgeGroups().forEach(ageGroup => {

                    const groupNormalizer = absTotal / ageGroup.getAbsValue();

                    const compartmentFilterSusceptible = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.S_SUSCEPTIBLE && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterExposed = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.E_____EXPOSED && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterInfectious = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.I__INFECTIOUS && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedID = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_ID) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedIU = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_IU) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterRemovedV1 = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_VI && c.getAgeGroupIndex() === ageGroup.getIndex()));
                    const compartmentFilterRemovedVR = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_VU && c.getAgeGroupIndex() === ageGroup.getIndex()));
                    const compartmentFilterRemovedV2 = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.R__REMOVED_V2 && c.getAgeGroupIndex() === ageGroup.getIndex()));
                    const compartmentFilterRemovedVC = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__REMOVED_VC && c.getAgeGroupIndex() === ageGroup.getIndex()));
                    const compartmentFilterCases = new CompartmentFilter(c => c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getAgeGroupIndex() === ageGroup.getIndex());
                    const compartmentFilterAgeGroupTotal = new CompartmentFilter(c => (c.getCompartmentType() !== ECompartmentType.X__INCUBATE_0 && c.getCompartmentType() !== ECompartmentType.X__INCUBATE_N) && c.getAgeGroupIndex() === ageGroup.getIndex());

                    const removedID = this.modelState.getNrmValueSum(compartmentFilterRemovedID) * groupNormalizer;
                    const removedIU = this.modelState.getNrmValueSum(compartmentFilterRemovedIU) * groupNormalizer;
                    const removedV1 = this.modelState.getNrmValueSum(compartmentFilterRemovedV1) * groupNormalizer;
                    const removedVR = this.modelState.getNrmValueSum(compartmentFilterRemovedVR) * groupNormalizer;
                    const removedV2 = this.modelState.getNrmValueSum(compartmentFilterRemovedV2) * groupNormalizer;
                    const removedVC = this.modelState.getNrmValueSum(compartmentFilterRemovedVC) * groupNormalizer;
                    const discovery = modificationTime.getDiscoveryRatios(ageGroup.getIndex()).discovery;

                    const incidencesAgeGroup: {[K: string]: number} = {};
                    const exposedAgeGroup: {[K: string]: number} = {};
                    const infectiousAgeGroup: {[K: string]: number} = {};

                    incidencesAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                    exposedAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer;
                    infectiousAgeGroup[ModelConstants.STRAIN_ID___________ALL] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer;

                    modificationValuesStrain.forEach(modificationValueStrain => {

                        const compartmentFilterIncidence = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterExposed = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.E_____EXPOSED) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);
                        const compartmentFilterInfectious = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.I__INFECTIOUS) && c.getAgeGroupIndex() === ageGroup.getIndex() && c.getStrainId() === modificationValueStrain.id);

                        incidencesAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterIncidence) * 100000 * groupNormalizer;
                        exposedAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterExposed) * groupNormalizer;
                        infectiousAgeGroup[modificationValueStrain.id] = this.modelState.getNrmValueSum(compartmentFilterInfectious) * groupNormalizer;

                    });
                    dataItem.valueset[ageGroup.getName()] = {
                        SUSCEPTIBLE: this.modelState.getNrmValueSum(compartmentFilterSusceptible) * groupNormalizer,
                        REMOVED_ID: removedID,
                        REMOVED_IU: removedIU,
                        REMOVED_V1: removedV1,
                        REMOVED_VR: removedVR,
                        REMOVED_V2: removedV2,
                        REMOVED_VC: removedVC,
                        CASES: this.modelState.getNrmValueSum(compartmentFilterCases) * absTotal,
                        INCIDENCES: incidencesAgeGroup,
                        EXPOSED: exposedAgeGroup,
                        INFECTIOUS: infectiousAgeGroup,
                        TOTAL: this.modelState.getNrmValueSum(compartmentFilterAgeGroupTotal) * groupNormalizer,
                        DISCOVERY: discovery
                    };

                });

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

}
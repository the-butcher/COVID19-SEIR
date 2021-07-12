import { Demographics } from '../common/demographics/Demographics';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTesting } from '../common/modification/ModificationTesting';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { Modifications } from './../common/modification/Modifications';
import { BaseData, IBaseDataItem } from './calibration/BaseData';
import { StrainApproximatorBaseData } from './calibration/StrainApproximatorBaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplStrain } from './ModelImplStrain';
import { ModelImplVaccination } from './ModelImplVaccination';
import { ModelInstants } from './ModelInstants';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { IModelProgress, ModelStateIntegrator } from './state/ModelStateIntegrator';

interface IVaccinationGroupData {
    nrmReqS: number; // susceptible - vaccination of susceptible population -> 2 shots
    nrmReqD: number; // discovered - vaccination of cases previously discovered -> 1 shot
    nrmReqU: number; // undiscovered - vaccination of cases previously undiscovered -> 2 shots
}

interface IBaseIncidences {
    overall: number,
    agewise: number[]
}

/**
 * root model holding a set of age-specific submodels
 *
 * @author h.fleischer
 * @since 24.04.2021
 */
export class ModelImplRoot implements IModelSeir {

    /**
     * this method performs multiple integrations of the model from a date earlier than the actual model date
     * from the model values at specific times in the model integration corrective multipliers are approximated
     * that way the desired starting values can be achieved with satisfactory precision
     * @param demographics
     * @param modifications
     * @param progressCallback
     * @returns
     */
    static async setupInstance(demographics: Demographics, modifications: Modifications, baseData: BaseData, progressCallback: (progress: IModelProgress) => void): Promise<ModelStateIntegrator> {

        //const approximator = new StrainApproximatorCalibrate(demographics, modifications);
        const approximator = new StrainApproximatorBaseData(demographics, modifications, baseData);
        await approximator.approximate(progressCallback);

        const instantDst = ModelInstants.getInstance().getMinInstant();
        const instantPre = ModelInstants.getInstance().getPreInstant();

        /**
         * final model setup with adapted modifications values
         * since the model contains the preload portion, that portion is fast forwarded and the state-integrator is returned being positioned at model-start instant
         */
        const model = new ModelImplRoot(demographics, Modifications.getInstance(), approximator.getReferenceDataRemoved(), baseData);
        const modelStateIntegrator = new ModelStateIntegrator(model, instantPre);
        // await modelStateIntegrator.buildModelData(instantDst - TimeUtil.MILLISECONDS_PER____DAY, () => false, () => {});
        modelStateIntegrator.resetExposure();

        return modelStateIntegrator;

    }

    private readonly demographics: Demographics;
    private readonly valid: boolean;

    private readonly strainModels: ModelImplStrain[];
    private readonly compartmentsSusceptible: CompartmentBase[];
    private readonly compartmentsRemovedD: CompartmentBase[];
    private readonly compartmentsRemovedU: CompartmentBase[];

    /**
     * submodels with compartments for individuals vaccinated once and individuals vaccinated twice
     */
    private readonly vaccinationModels: ModelImplVaccination[];

    constructor(demographics: Demographics, modifications: Modifications, referenceDataRemoved: IBaseDataItem, baseData: BaseData) {

        this.strainModels = [];
        this.compartmentsSusceptible = [];
        this.compartmentsRemovedD = [];
        this.compartmentsRemovedU = [];
        this.vaccinationModels = [];

        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;
        const modificationTesting = modifications.findModificationsByType('TESTING')[0] as ModificationTesting;

        this.demographics = demographics;
        modifications.findModificationsByType('STRAIN').forEach((modificationStrain: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modificationStrain.getModificationValues(), modificationTesting, baseData));
        });

        demographics.getAgeGroups().forEach(ageGroup => {

            const absVacc1 = BaseData.getVacc1(referenceDataRemoved, ageGroup.getName());
            const absVacc2 = BaseData.getVacc2(referenceDataRemoved, ageGroup.getName());

            const absValueD = BaseData.getRemoved(referenceDataRemoved, ageGroup.getName()); // referenceDataRemoved[ageGroup.getName()][ModelConstants.BASE_DATA_INDEX_REMOVED];
            const absValueU = absValueD * modificationSettings.getUndetected();

            // total share of people already vaccinated twice
            const shrVacc2 = absVacc2 / ageGroup.getAbsValue();

            // reduce recovered sizes by assumed shares of recovered/vaccinated
            const offVaccD = absValueD * shrVacc2;
            const offVaccU = absValueU * shrVacc2;

            // TODO reduce this by share of recovered
            const absValueI = (absVacc1 - absVacc2); // - offVaccD - offVaccU; // initial value problem here

            // console.log('shares', ageGroup.getName(), shrVacc2.toFixed(3), absVacc2, absValueD + absValueU);

            const vaccinationModel = new ModelImplVaccination(this, demographics, absValueI, ageGroup);
            this.vaccinationModels.push(vaccinationModel);

            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R__REMOVED_ID, this.demographics.getAbsTotal(), absValueD - offVaccD, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            const compartmentRemovedU = new CompartmentBase(ECompartmentType.R__REMOVED_IU, this.demographics.getAbsTotal(), absValueU - offVaccU, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedU.push(compartmentRemovedU);

        });

        // now find out how many people are already contained in compartments / by age group
        demographics.getAgeGroups().forEach(ageGroup => {
            const absValueSusceptible = ageGroup.getAbsValue() - this.getNrmValueGroup(ageGroup.getIndex(), true) * this.getAbsValue();
            const compartmentSusceptible = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.demographics.getAbsTotal(), absValueSusceptible, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsSusceptible.push(compartmentSusceptible);
        });

    }

    findStrainModel(strainId: string): ModelImplStrain {
        return this.strainModels.find(m => m.getStrainId() === strainId);
    }

    getRootModel(): ModelImplRoot {
        return this;
    }

    getCompartmentsSusceptible(ageGroupIndex: number): CompartmentBase[] {
        return [this.compartmentsSusceptible[ageGroupIndex], this.vaccinationModels[ageGroupIndex].getCompartmentI()];
    }

    getCompartmentRemovedD(ageGroupIndex: number): CompartmentBase {
        return this.compartmentsRemovedD[ageGroupIndex];
    }

    getCompartmentRemovedU(ageGroupIndex: number): CompartmentBase {
        return this.compartmentsRemovedU[ageGroupIndex];
    }

    getNrmValueGroup(ageGroupIndex: number, excludeSusceptible?: boolean): number {
        let nrmValueGroup = 0;
        if (!excludeSusceptible) {
            nrmValueGroup += this.compartmentsSusceptible[ageGroupIndex].getNrmValue();
        }
        nrmValueGroup += this.compartmentsRemovedD[ageGroupIndex].getNrmValue();
        nrmValueGroup += this.compartmentsRemovedU[ageGroupIndex].getNrmValue();
        this.strainModels.forEach(strainModel => {
            nrmValueGroup += strainModel.getNrmValueGroup(ageGroupIndex);
        });
        this.vaccinationModels.forEach(vaccinationModel => {
            nrmValueGroup += vaccinationModel.getNrmValueGroup(ageGroupIndex);
        });
        return nrmValueGroup;
    }

    getDemographics(): Demographics {
        return this.demographics;
    }

    getAbsTotal(): number {
        return this.demographics.getAbsTotal();
    }

    getNrmValue(): number {
        return 1;
    }

    getAbsValue(): number {
        return this.demographics.getAbsTotal();
    }

    isValid(): boolean {
        return this.valid;
    }

    /**
     * get the initial state of this model (this state includes the preloaded portion of the model which must be "released")
     */
    getInitialState(): IModelState {
        const initialState = ModelState.empty();
        this.compartmentsSusceptible.forEach(compartmentSusceptible => {
            initialState.addNrmValue(compartmentSusceptible.getNrmValue(), compartmentSusceptible);
        });
        this.compartmentsRemovedD.forEach(compartmentRemovedD => {
            initialState.addNrmValue(compartmentRemovedD.getNrmValue(), compartmentRemovedD);
        });
        this.compartmentsRemovedU.forEach(compartmentRemovedU => {
            initialState.addNrmValue(compartmentRemovedU.getNrmValue(), compartmentRemovedU);
        });
        this.strainModels.forEach(strainModel => {
            initialState.add(strainModel.getInitialState());
        });
        this.vaccinationModels.forEach(vaccinationModel => {
            initialState.add(vaccinationModel.getInitialState());
        });
        return initialState;
    }

    applyVaccination(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        const result = ModelState.empty();

        // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0) {
        //     console.log('mult', TimeUtil.formatCategoryDate(tT), requestMultiplier, nrmJabTotal * this.getAbsTotal() * 24);
        // }

        for (let i = 0; i < this.vaccinationModels.length; i++) {

            // find vacc1 values as of vaccination curve
            const lut1 = modificationTime.getLut1ByName(this.vaccinationModels[i].getAgeGroupName());
            const grpVal1A = lut1[tT - dT];
            const grpVal1B = lut1[tT];

            // find vacc2 values as of vaccination curve
            const lut2 = modificationTime.getLut2ByName(this.vaccinationModels[i].getAgeGroupName());
            const grpVal2A = lut2[tT - dT];
            const grpVal2B = lut2[tT];

            if (grpVal1A && grpVal1B && grpVal2A && grpVal2B) {

                // find vacc1 step
                const grpJab1T = grpVal1B - grpVal1A;
                const nrmJab1T = grpJab1T / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();

                // find vacc2 step
                const grpJab2T = grpVal2B - grpVal2A;
                const nrmJab2T = grpJab2T / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();

                /**
                 * with the knowledge of 1st shots make an assumption about effects on the underlying model
                 * assume that shots are distributed to
                 * susceptible -> move to immunizing
                 * recoveredD  -> move to vaccinated
                 * recoveredU  -> move to vaccinated
                 */
                const nrmWeight1S = state.getNrmValue(this.compartmentsSusceptible[i]);
                const nrmWeight1D = state.getNrmValue(this.compartmentsRemovedD[i]);
                const nrmWeight1U = state.getNrmValue(this.compartmentsRemovedU[i]);
                const nrmWeight1T = nrmWeight1S + nrmWeight1D + nrmWeight1U;

                // known infection -> vaccinated (1 shot)
                const nrmJabDV = nrmJab1T * nrmWeight1D / nrmWeight1T;

                // unknown infection -> vaccinated (2 shots),
                const nrmJabUV = nrmJab1T * nrmWeight1U / nrmWeight1T;

                /**
                 * immunizing -> vaccinated (fill remaining v2 capacity)
                 * nrmJabIV
                 * nrmJabDV
                 * nrmJabUV
                 * will sum up to full v2 value --> curve is fulfilled
                 */
                const nrmJabIV = nrmJab2T - nrmJabDV - nrmJabUV;

                // susceptible -> immunizing
                // TODO reduce this by share of recovered
                const nrmDiffA = state.getNrmValue(this.vaccinationModels[i].getCompartmentI());
                const nrmDiffB = (grpVal1B - grpVal2B) / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();
                const nrmJabSI = nrmDiffB - nrmDiffA + nrmJabIV;

                result.addNrmValue(-nrmJabSI, this.compartmentsSusceptible[i]);
                result.addNrmValue(+nrmJabSI, this.vaccinationModels[i].getCompartmentI());

                result.addNrmValue(-nrmJabIV, this.vaccinationModels[i].getCompartmentI());
                result.addNrmValue(+nrmJabIV, this.vaccinationModels[i].getCompartmentV());

                result.addNrmValue(-nrmJabDV, this.compartmentsRemovedD[i]);
                result.addNrmValue(+nrmJabDV, this.vaccinationModels[i].getCompartmentV());

                result.addNrmValue(-nrmJabUV, this.compartmentsRemovedU[i]);
                result.addNrmValue(+nrmJabUV, this.vaccinationModels[i].getCompartmentV());

                result.addNrmValue(+nrmJab1T, this.vaccinationModels[i].getCompartmentC());

            }

        }

        // move from V1 to V2 -- all of vaccination movement in ModelImplRoot currently
        // this.vaccinationModels.forEach(vaccinationModel => {
        //     result.add(vaccinationModel.apply(state, dT, tT, modificationTime));
        // });

        return result;

    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = this.applyVaccination(state, dT, tT, modificationTime);
        this.strainModels.forEach(strainModel => {
            result.add(strainModel.apply(state, dT, tT, modificationTime));
        });
        return result;
    }

}

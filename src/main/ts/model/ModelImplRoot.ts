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
        await modelStateIntegrator.buildModelData(instantDst - TimeUtil.MILLISECONDS_PER____DAY, () => false, () => {});
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
        // const settingsValues = modificationSettings.getModificationValues();

        const modificationTesting = modifications.findModificationsByType('TESTING')[0] as ModificationTesting;
        // const testingValues = modificationSettings.getModificationValues();

        this.demographics = demographics;
        modifications.findModificationsByType('STRAIN').forEach((modificationStrain: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modificationStrain.getModificationValues(), modificationTesting, baseData));
        });

        demographics.getAgeGroups().forEach(ageGroup => {

            // initial values in the removed compartment
            // a pre-calculation of susceptible
            let absValueD = referenceDataRemoved[ageGroup.getName()][ModelConstants.BASE_DATA_INDEX_REMOVED];
            let absValueU = absValueD * modificationSettings.getUndetected();
            const absValueV = referenceDataRemoved[ageGroup.getName()][ModelConstants.BASE_DATA_INDEX_VACC2ND]
            let absValueS = ageGroup.getAbsValue();
            absValueS -= absValueD;
            absValueS -= absValueU;
            absValueS -= absValueV;
            this.strainModels.forEach(strainModel => {
                absValueS -= strainModel.getNrmValueGroup(ageGroup.getIndex());
            });

            // total values subject to vaccination
            const absWeightT = absValueS + absValueD + absValueU;
            const shrValueS = absValueS / absWeightT;
            const shrValueD = absValueD / absWeightT;
            const shrValueU = absValueU / absWeightT;

            // console.log(ageGroup.getName(), absValueD, absValueU, absValueV);

            // have removed contacts initially reduced to model already vaccinated individuals that were previously infected
            absValueD -= absValueV * shrValueD ;
            absValueU -= absValueV * shrValueU ;

            const vaccinationModel = new ModelImplVaccination(this, demographics, ageGroup);
            this.vaccinationModels.push(vaccinationModel);

            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R__REMOVED_ID, this.demographics.getAbsTotal(), absValueD, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            const compartmentRemovedU = new CompartmentBase(ECompartmentType.R__REMOVED_IU, this.demographics.getAbsTotal(), absValueU, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
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
        return [this.compartmentsSusceptible[ageGroupIndex], ...this.vaccinationModels[ageGroupIndex].getCompartmentsV1()];
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

            const lut = modificationTime.getLutByName(this.vaccinationModels[i].getAgeGroupName());

            const valueA = lut[tT - dT];
            const valueB = lut[tT];

            if (valueA && valueB) {

                // const grpJabS = valueB - valueA;
                const grpJabT = valueB - valueA;
                const nrmJabT = grpJabT / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();

                const nrmWeightS = state.getNrmValue(this.compartmentsSusceptible[i]);
                const nrmWeightD = state.getNrmValue(this.compartmentsRemovedD[i]);
                const nrmWeightU = state.getNrmValue(this.compartmentsRemovedU[i]);
                const nrmWeightT = nrmWeightS + nrmWeightD + nrmWeightU;

                const nrmJabS = nrmJabT * nrmWeightS / nrmWeightT;
                const nrmJabD = nrmJabT * nrmWeightD / nrmWeightT;
                const nrmJabU = nrmJabT * nrmWeightU / nrmWeightT;

                // remove from susceptible and add to immunizing compartment
                result.addNrmValue(-nrmJabS, this.compartmentsSusceptible[i]);
                result.addNrmValue(+nrmJabS, this.vaccinationModels[i].getCompartmentsV1()[0]);

                result.addNrmValue(-nrmJabD, this.compartmentsRemovedD[i]);
                result.addNrmValue(+nrmJabD, this.vaccinationModels[i].getCompartmentV2());

                result.addNrmValue(-nrmJabU, this.compartmentsRemovedU[i]);
                result.addNrmValue(+nrmJabU, this.vaccinationModels[i].getCompartmentV2());

                result.addNrmValue(+nrmJabT, this.vaccinationModels[i].getCompartmentVC());

                // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0 && i === 8) {
                //     console.log('mult', TimeUtil.formatCategoryDate(tT), i, grpJabS, state.getNrmValue(this.vaccinationModels[i].getCompartmentVC()) * this.getAbsTotal());
                // }

            }

        }

        this.vaccinationModels.forEach(vaccinationModel => {
            result.add(vaccinationModel.apply(state, dT, tT, modificationTime));
        });

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

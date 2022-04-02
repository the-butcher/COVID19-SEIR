import { Demographics } from '../common/demographics/Demographics';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { Modifications } from './../common/modification/Modifications';
import { TimeUtil } from './../util/TimeUtil';
import { BaseData } from './basedata/BaseData';
import { IBaseDataItem } from './basedata/BaseDataItem';
import { StrainApproximatorBaseData } from './calibration/StrainApproximatorBaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChainReproduction } from './compartment/CompartmentChainReproduction';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplStrain } from './ModelImplStrain';
import { ModelImplVaccination } from './ModelImplVaccination';
import { ModelInstants } from './ModelInstants';
import { RationalDurationFixed } from './rational/RationalDurationFixed';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { IModelProgress, ModelStateIntegrator } from './state/ModelStateIntegrator';

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
     * 
     * @param demographics
     * @param modifications
     * @param progressCallback
     * @returns
     */
    static async setupInstance(demographics: Demographics, modifications: Modifications, baseData: BaseData, progressCallback: (progress: IModelProgress) => void): Promise<ModelStateIntegrator> {

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
        await modelStateIntegrator.buildModelData(instantDst - TimeUtil.MILLISECONDS_PER____DAY, () => false, () => { });
        modelStateIntegrator.resetExposure();
        return modelStateIntegrator;

    }

    private readonly demographics: Demographics;

    private readonly strainModels: ModelImplStrain[];
    private readonly compartmentsSusceptible: CompartmentBase[];
    private readonly compartmentsRemoved: CompartmentBase[];
    // private readonly compartmentsRemovedU: CompartmentBase[];

    /**
     * submodels with compartments for individuals vaccinated once and individuals vaccinated twice
     */
    private readonly vaccinationModels: ModelImplVaccination[];

    constructor(demographics: Demographics, modifications: Modifications, referenceDataRemoved: IBaseDataItem, baseData: BaseData) {

        this.strainModels = [];
        this.compartmentsSusceptible = [];
        this.compartmentsRemoved = [];
        // this.compartmentsRemovedU = [];
        this.vaccinationModels = [];

        const modificationTime = modifications.findModificationsByType('TIME')[0] as ModificationTime;
        modificationTime.setInstants(ModelInstants.getInstance().getPreInstant(), ModelInstants.getInstance().getPreInstant());
        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;

        this.demographics = demographics;
        modifications.findModificationsByType('STRAIN').forEach((modificationStrain: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modificationStrain.getModificationValues(), modificationTime, referenceDataRemoved, modificationSettings.getInitialUndetected()));
        });

        demographics.getAgeGroups().forEach(ageGroup => {

            // start with full population of respective group
            let absValueSusceptible = ageGroup.getAbsValue()
            this.strainModels.forEach(strainModel => {
                // subtract anything that may be in any infection model state
                absValueSusceptible -= strainModel.getNrmValueGroup(ageGroup.getIndex()) * this.getAbsTotal();
            });

            // removed at model init and reduced by initial share of vaccination
            let absValueRecoveredD = referenceDataRemoved.getRemoved(ageGroup.getName()) * (1 + modificationSettings.getInitialUndetected());
            absValueSusceptible -= absValueRecoveredD;

            const vaccinationConfig = modificationTime.getVaccinationConfig2(ageGroup.getName());
            const grpRatio = 1 - ageGroup.getIndex() * 0.05; // 0.55 for oldest (longer ago), 1 for youngest (were vaccinated more recently)
            const grpValueV2 = vaccinationConfig.v2 * grpRatio;

            let absValueV2 = grpValueV2 * ageGroup.getAbsValue();
            absValueSusceptible -= absValueV2;

            const vaccinationModel = new ModelImplVaccination(this, demographics, modificationTime, 0, absValueV2, ageGroup);
            this.vaccinationModels.push(vaccinationModel);

            const durationToReexposable = modificationTime.getReexposure() * TimeUtil.MILLISECONDS_PER____DAY * 30;
            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R___REMOVED_ID, this.demographics.getAbsTotal(), absValueRecoveredD, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, new RationalDurationFixed(durationToReexposable), '');
            this.compartmentsRemoved.push(compartmentRemovedD);

            const compartmentSusceptible = new CompartmentBase(ECompartmentType.S__SUSCEPTIBLE, this.demographics.getAbsTotal(), absValueSusceptible, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChainReproduction.NO_CONTINUATION, '');
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
        return [
            this.compartmentsSusceptible[ageGroupIndex],
            this.vaccinationModels[ageGroupIndex].getCompartmentI(), // immunizing
            this.vaccinationModels[ageGroupIndex].getCompartmentV(), // vaccinated
            // this.vaccinationModels[ageGroupIndex].getCompartmentU(), // vaccinated
            this.compartmentsRemoved[ageGroupIndex], // recovered (discovered infection)
            // this.compartmentsRemovedU[ageGroupIndex]  // recovered (undiscovered infection)
        ];
    }

    /**
     * get all compartments holding immune population, thus loosing immunity over time
     * @param ageGroupIndex
     * @returns
     */
    getCompartmentsLoosingImmunity(ageGroupIndex: number): CompartmentBase[] {
        return [
            this.vaccinationModels[ageGroupIndex].getCompartmentV(),
            // this.vaccinationModels[ageGroupIndex].getCompartmentU(),
            this.compartmentsRemoved[ageGroupIndex],
            // this.compartmentsRemovedU[ageGroupIndex]
        ];
    }

    /**
     * get the compartment that contains people that knew about their infection and that are now recovered
     * @param ageGroupIndex the specific age group to get the compartment for
     * @returns
     */
    getCompartmentRemoved(ageGroupIndex: number): CompartmentBase {
        return this.compartmentsRemoved[ageGroupIndex];
    }

    // /**
    //  * get the compartment that contains people that did not know about their infection and that are now recovered
    //  * @param ageGroupIndex the specific age group to get the compartment for
    //  * @returns
    //  */
    // getCompartmentRemovedU(ageGroupIndex: number): CompartmentBase {
    //     return this.compartmentsRemovedU[ageGroupIndex];
    // }

    /**
     * get the compartment that contains fully vaccinated people
     * @param ageGroupIndex the specific age group to get the compartment for
     * @returns
     */
    getCompartmentRemovedV(ageGroupIndex: number): CompartmentBase {
        return this.vaccinationModels[ageGroupIndex].getCompartmentV();
    }

    getNrmValueGroup(ageGroupIndex: number): number {
        console.error('nrm val group called on root');
        let nrmValueGroup = 0;
        nrmValueGroup += this.compartmentsSusceptible[ageGroupIndex].getNrmValue();
        nrmValueGroup += this.compartmentsRemoved[ageGroupIndex].getNrmValue();
        // nrmValueGroup += this.compartmentsRemovedU[ageGroupIndex].getNrmValue();
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

    /**
     * get the initial state of this model (this state includes the preloaded portion of the model which must be "released")
     */
    getInitialState(): IModelState {
        const initialState = ModelState.empty();
        this.compartmentsSusceptible.forEach(compartmentSusceptible => {
            initialState.addNrmValue(compartmentSusceptible.getNrmValue(), compartmentSusceptible);
        });
        this.compartmentsRemoved.forEach(compartmentRemovedD => {
            initialState.addNrmValue(compartmentRemovedD.getNrmValue(), compartmentRemovedD);
        });
        // this.compartmentsRemovedU.forEach(compartmentRemovedU => {
        //     initialState.addNrmValue(compartmentRemovedU.getNrmValue(), compartmentRemovedU);
        // });
        this.strainModels.forEach(strainModel => {
            initialState.add(strainModel.getInitialState());
        });
        this.vaccinationModels.forEach(vaccinationModel => {
            initialState.add(vaccinationModel.getInitialState());
        });
        return initialState;
    }

    /**
     * from people previously having gained immunity, return a specific share to susceptible, as immunity vanishes over time
     * @param state
     * @param dT
     * @param tT
     * @param modificationTime
     * @returns
     */
    applyLossOfImmunity(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        const result = ModelState.empty();

        /**
         * have vaccinated population wane back to susceptible, age-group wise
         */
        for (let ageGroupIndex = 0; ageGroupIndex < this.compartmentsSusceptible.length; ageGroupIndex++) {

            const compartmentSusceptible = this.compartmentsSusceptible[ageGroupIndex];

            let nrmImmunityLossSum = 0;
            this.getCompartmentsLoosingImmunity(ageGroupIndex).forEach(compartmentLoosingImmunity => {

                const nrmImmunityLoss = compartmentLoosingImmunity.getContinuationRatio().getRate(dT, tT) * state.getNrmValue(compartmentLoosingImmunity);
                nrmImmunityLossSum += nrmImmunityLoss;

                // subtract from compartment
                result.addNrmValue(-nrmImmunityLoss, compartmentLoosingImmunity);

            });

            result.addNrmValue(nrmImmunityLossSum, compartmentSusceptible);

        }

        return result;

    }

    applyVaccination(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        const result = ModelState.empty();
        for (let i = 0; i < this.vaccinationModels.length; i++) {

            /**
             * threshold value that keeps compartments from intersecting and doing strange things
             */
            const minRemain = 500 / this.vaccinationModels[i].getAgeGroupTotal();
            const vaccinationsPerDay = modificationTime.getVaccinationConfig2(this.vaccinationModels[i].getAgeGroupName());

            /**
             * vaccination to be added in this step (group percent)
             */
            const grpJab1T = vaccinationsPerDay.d1 * dT / TimeUtil.MILLISECONDS_PER____DAY;
            const grpJab2T = vaccinationsPerDay.d2 * dT / TimeUtil.MILLISECONDS_PER____DAY;
            const grpJab3T = vaccinationsPerDay.d3 * dT / TimeUtil.MILLISECONDS_PER____DAY;
            const nrmJab1T = grpJab1T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();
            const nrmJab2T = grpJab2T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();
            const nrmJab3T = grpJab3T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();

            /**
             * assumptions about 1st dose
             */
            const nrmValueSC = Math.max(minRemain, state.getNrmValue(this.compartmentsSusceptible[i])) - minRemain; // susceptible to immunizing
            const nrmValueDV = Math.max(minRemain, state.getNrmValue(this.compartmentsRemoved[i])) - minRemain; // single shot after recovery
            // const nrmValueUU = Math.max(minRemain, state.getNrmValue(this.compartmentsRemovedU[i])) - minRemain; // undiscovered to vaccinated (interim)
            const nrmWeight1 = nrmValueSC + nrmValueDV; // + nrmValueUU;

            const nrmJabSI = nrmWeight1 !== 0 ? nrmJab1T * nrmValueSC / nrmWeight1 : 0;
            const nrmJabDV = nrmWeight1 !== 0 ? nrmJab1T * nrmValueDV / nrmWeight1 : 0;
            // const nrmJabUU = nrmWeight1 !== 0 ? nrmJab1T * nrmValueUU / nrmWeight1 : 0;

            /**
             * assumptions about 2nd dose
             */
            const nrmValueVI = Math.max(minRemain, state.getNrmValue(this.vaccinationModels[i].getCompartmentI())) - minRemain; // immunizing to vaccinated (regular second shot)
            // const nrmValueVU = Math.max(minRemain, state.getNrmValue(this.vaccinationModels[i].getCompartmentU())) - minRemain; // vaccinated to vaccinated
            const nrmWeight2 = nrmValueVI; // + nrmValueVU;

            const nrmJabIV = nrmWeight2 !== 0 ? nrmJab2T * nrmValueVI / nrmWeight2 : 0;
            // const nrmJabUV = nrmWeight2 !== 0 ? nrmJab2T * nrmValueVU / nrmWeight2 : 0;

            result.addNrmValue(-nrmJabSI, this.compartmentsSusceptible[i]);
            result.addNrmValue(+nrmJabSI, this.vaccinationModels[i].getCompartmentI());

            // result.addNrmValue(-nrmJabUU, this.compartmentsRemovedU[i]);
            // result.addNrmValue(+nrmJabUU, this.vaccinationModels[i].getCompartmentU());

            result.addNrmValue(-nrmJabIV, this.vaccinationModels[i].getCompartmentI());
            result.addNrmValue(+nrmJabIV, this.vaccinationModels[i].getCompartmentV());

            result.addNrmValue(-nrmJabDV, this.compartmentsRemoved[i]);
            result.addNrmValue(+nrmJabDV, this.vaccinationModels[i].getCompartmentV());

            // result.addNrmValue(-nrmJabUV, this.vaccinationModels[i].getCompartmentU());
            // result.addNrmValue(+nrmJabUV, this.vaccinationModels[i].getCompartmentV());

            // v3 (TODO: find out if the time to re-gain immunity is significant and needs to be modelled)
            result.addNrmValue(-nrmJab3T, this.compartmentsSusceptible[i]);
            result.addNrmValue(+nrmJab3T, this.vaccinationModels[i].getCompartmentR());

            const compartmentVR = this.vaccinationModels[i].getCompartmentR();
            const nrmRegainedImmunity = compartmentVR.getContinuationRatio().getRate(dT, tT) * state.getNrmValue(compartmentVR);

            // subtract from compartment
            result.addNrmValue(-nrmRegainedImmunity, compartmentVR);
            result.addNrmValue(+nrmRegainedImmunity, this.vaccinationModels[i].getCompartmentV());

        }

        return result;

    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = this.applyVaccination(state, dT, tT, modificationTime);
        result.add(this.applyLossOfImmunity(state, dT, tT, modificationTime)); // TODO :: add a series of recovery chains to each strain (so some strains can hold immunity shorter or longer than others)
        this.strainModels.forEach(strainModel => {
            result.add(strainModel.apply(state, dT, tT, modificationTime));
        });
        return result;
    }

}

import { Demographics } from '../common/demographics/Demographics';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { Logger } from '../util/Logger';
import { TimeUtil } from '../util/TimeUtil';
import { IModificationValuesContact } from './../common/modification/IModificationValuesContact';
import { IModificationValuesTesting } from './../common/modification/IModificationValuesTesting';
import { Modifications } from './../common/modification/Modifications';
import { ObjectUtil } from './../util/ObjectUtil';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplStrain } from './ModelImplStrain';
import { ModelImplVaccination } from './ModelImplVaccination';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { IModelProgress, ModelStateIntegrator } from './state/ModelStateIntegrator';

interface IVaccinationGroupData {
    nrmVaccS: number; // susceptible - vaccination of susceptible population
    nrmVaccD: number; // discovered - vaccination of cases previously discovered -> 1 shot
    nrmVaccU: number; // undiscovered - vaccination of cases previously undiscovered -> 2 shots
    nrmTotal: number;
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
    static async setupInstance(demographics: Demographics, modifications: Modifications, progressCallback: (progress: IModelProgress) => void): Promise<ModelStateIntegrator> {

        /**
         * start at minus preload days
         */
        const curInstant = ModelConstants.MODEL_MIN____________INSTANT - TimeUtil.MILLISECONDS_PER_DAY * ModelConstants.PRELOAD_________________DAYS;

        /**
         * get all strain values as currently in modifications instance
         */
        const modificationsStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m as ModificationStrain);
        const incidences = modificationsStrain.map(m => m.getIncidence());

        /**
         * adapt first contact modification to have initial conditions even in preload range
         */
        const modificationValueContact = Modifications.getInstance().findModificationsByType('CONTACT')[0].getModificationValues() as IModificationValuesContact;
        const modificationValueTesting = Modifications.getInstance().findModificationsByType('TESTING')[0].getModificationValues() as IModificationValuesTesting;

        modificationValueContact.instant = curInstant;
        modificationValueTesting.instant = curInstant;

        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;
        let vaccinationMultiplier = 1;

        let model;
        let modelStateIntegrator: ModelStateIntegrator;

        /**
         * 5 interpolation runs
         */
        for (let interpolationIndex = 0; interpolationIndex < 5; interpolationIndex++) {

            model = new ModelImplRoot(demographics, modifications);
            modelStateIntegrator = new ModelStateIntegrator(model, curInstant);
            modelStateIntegrator.prefillVaccination(vaccinationMultiplier);

            let modelData: any[];
            let lastDataItem: any;
            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                const dstInstant = modificationsStrain[strainIndex].getInstantA();
                modelData = await modelStateIntegrator.buildModelData(dstInstant, curInstant => curInstant === dstInstant, modelProgress => {
                    progressCallback({
                        ratio: modelProgress.ratio
                    });
                });
                lastDataItem = modelData[modelData.length - 1];

                /**
                 * adjust incidence by multiplication
                 */
                const totalIncidenceStrain = lastDataItem[`TOTAL_INCIDENCE_${modificationsStrain[strainIndex].getId()}`];
                const totalIncidenceTarget = incidences[strainIndex];
                const totalIncidenceFactor = totalIncidenceTarget / totalIncidenceStrain;

                const ageGroupIncidences: number[] = [];
                demographics.getAgeGroups().forEach(ageGroup => {
                    const ageGroupIncidence = lastDataItem[`${ageGroup.getName()}_INCIDENCE_${modificationsStrain[strainIndex].getId()}`];
                    ageGroupIncidences[ageGroup.getIndex()] = ageGroupIncidence * totalIncidenceFactor;
                });

                modificationsStrain[strainIndex].acceptUpdate({
                    incidence:  modificationsStrain[strainIndex].getIncidence() * totalIncidenceFactor,
                    ageGroupIncidences
                });

                // Logger.getInstance().log(interpolationIndex, ageGroupIncidences, ObjectUtil.normalize(ageGroupIncidences));

            };
            const overallVaccinated = lastDataItem.TOTAL_REMOVED_V;

            // adjust the vaccination multiplier to interpolate to a value that gives a closer match to desired settings
            vaccinationMultiplier *= modificationSettings.getVaccinated() / overallVaccinated;

        }

        /**
         * final model setup with adapted modifications values,
         * integrate to match model start date
         */
        model = new ModelImplRoot(demographics, modifications);
        modelStateIntegrator = new ModelStateIntegrator(model, curInstant);
        modelStateIntegrator.prefillVaccination(vaccinationMultiplier);
        await modelStateIntegrator.buildModelData(ModelConstants.MODEL_MIN____________INSTANT - TimeUtil.MILLISECONDS_PER_DAY, () => false, () => {});

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

    private constructor(demographics: Demographics, modifications: Modifications) {

        this.strainModels = [];
        this.compartmentsSusceptible = [];
        this.compartmentsRemovedD = [];
        this.compartmentsRemovedU = [];
        this.vaccinationModels = [];

        this.demographics = demographics;
        modifications.findModificationsByType('STRAIN').forEach((modification: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modification.getModificationValues()));
        });

        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;
        const settingsValues = modificationSettings.getModificationValues();

        demographics.getAgeGroups().forEach(ageGroup => {

            // TODO initial share of discovery (may split recovered slider)
            const absValueRemovedD = ageGroup.getAbsValue() * settingsValues.recoveredD;
            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R___REMOVED_D, this.demographics.getAbsTotal(), absValueRemovedD, ageGroup.getIndex(), ModelConstants.STRAIN_ID_ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            const absValueRemovedU = ageGroup.getAbsValue() * settingsValues.recoveredU;
            const compartmentRemovedU = new CompartmentBase(ECompartmentType.R___REMOVED_U, this.demographics.getAbsTotal(), absValueRemovedU, ageGroup.getIndex(), ModelConstants.STRAIN_ID_ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedU.push(compartmentRemovedU);

            const shareOfRefusal = 0.40 - 0.25 * ageGroup.getIndex() / demographics.getAgeGroups().length;
            const vaccinationModel = new ModelImplVaccination(this, demographics, ageGroup, shareOfRefusal);
            this.vaccinationModels.push(vaccinationModel);

            // console.log('vaccinationModel', vaccinationModel.getAgeGroupIndex(), vaccinationModel.getNrmRefusal() * vaccinationModel.getAbsTotal(), vaccinationModel.getNrmRefusal() * vaccinationModel.getAbsTotal() / vaccinationModel.getAgeGroupTotal());

        });

        // now find out how many people are already contained in compartments / by age group
        demographics.getAgeGroups().forEach(ageGroup => {
            const absValueSusceptible = ageGroup.getAbsValue() - this.getNrmValueGroup(ageGroup.getIndex(), true) * this.getAbsValue();
            const compartmentSusceptible = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.demographics.getAbsTotal(), absValueSusceptible, ageGroup.getIndex(), ModelConstants.STRAIN_ID_ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsSusceptible.push(compartmentSusceptible);
        });

    }

    getRootModel(): ModelImplRoot {
        return this;
    }

    getCompartmentsSusceptible(ageGroupIndex: number): CompartmentBase[] {
        return [this.compartmentsSusceptible[ageGroupIndex], this.vaccinationModels[ageGroupIndex].getCompartmentImmunizing()];
    }

    getCompartmentRemovedD(ageGroupIndex: number): CompartmentBase {
        return this.compartmentsRemovedD[ageGroupIndex];
    }

    getCompartmentRemovedU(ageGroupIndex: number): CompartmentBase {
        return this.compartmentsRemovedU[ageGroupIndex];
    }

    /**
     * TODO must include susceptible as well
     * @param ageGroupIndex
     * @returns
     */
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



    applyVaccination(state: IModelState, dT: number, tT: number, dosesPerDay: number): IModelState {

        const result = ModelState.empty();

        // collect a total vaccination priority
        const vaccinationGroupDataset: IVaccinationGroupData[] = [];

        let totalVaccinationPriority = 0;

        for (let i = 0; i < this.vaccinationModels.length; i++) {

            // normalized refusal with regard to group size
            const nrmRefusal = this.vaccinationModels[i].getNrmRefusal();

            const nrmVaccS = Math.max(0, state.getNrmValue(this.compartmentsSusceptible[i]) - nrmRefusal);
            const nrmVaccD = Math.max(0, state.getNrmValue(this.compartmentsRemovedD[i]) - nrmRefusal);
            const nrmVaccU = Math.max(0, state.getNrmValue(this.compartmentsRemovedU[i]) - nrmRefusal);
            const nrmTotal = this.vaccinationModels[i].getGroupPriority() * (nrmVaccS * 2 + nrmVaccD + nrmVaccU * 2);
            const vaccinationGroupData: IVaccinationGroupData = {
                nrmVaccS,
                nrmVaccD,
                nrmVaccU,
                nrmTotal
            };
            vaccinationGroupDataset.push(vaccinationGroupData);
            totalVaccinationPriority += nrmTotal;

        }

        // // normalize
        // for (let i = 0; i < this.vaccinationModels.length; i ++) {
        //     vaccinationPriorities[i] /= totalVaccinationPriority;
        // }

        const nrmDosesTotal = dosesPerDay * dT / TimeUtil.MILLISECONDS_PER_DAY / this.getAbsTotal();
        // let nrmDosesAgeGroupTotal = 0;
        for (let i = 0; i < this.vaccinationModels.length; i++) {

            // create a share of doses for this age group
            const nrmDosesAgeGroup = nrmDosesTotal * vaccinationGroupDataset[i].nrmTotal / totalVaccinationPriority; // divide by two to simulate 2 shots
            if (nrmDosesAgeGroup > 0) {

                const nrmTotal = this.vaccinationModels[i].getGroupPriority() > 0 ? vaccinationGroupDataset[i].nrmTotal / this.vaccinationModels[i].getGroupPriority() : 0;

                // // distribute share to
                const nrmIncrS = nrmDosesAgeGroup * vaccinationGroupDataset[i].nrmVaccS / nrmTotal;
                const nrmIncrD = nrmDosesAgeGroup * vaccinationGroupDataset[i].nrmVaccD / nrmTotal;
                const nrmIncrU = nrmDosesAgeGroup * vaccinationGroupDataset[i].nrmVaccU / nrmTotal;

                // nrmDosesAgeGroupTotal += nrmIncrS;
                // nrmDosesAgeGroupTotal += nrmIncrD;
                // nrmDosesAgeGroupTotal += nrmIncrU;

                // const t = nrmIncrS * 2 + nrmIncrD + nrmIncrU * 2;

                // remove from susceptible and add to immunizing compartment
                result.addNrmValue(-nrmIncrS, this.compartmentsSusceptible[i]);
                result.addNrmValue(+nrmIncrS, this.vaccinationModels[i].getCompartmentImmunizing());

                // remove from discovered and add to vaccinated compartment
                result.addNrmValue(-nrmIncrD, this.compartmentsRemovedD[i]);
                result.addNrmValue(+nrmIncrD, this.vaccinationModels[i].getCompartmentImmunizedD());

                // remove from undiscovered and add to vaccinated compartment
                result.addNrmValue(-nrmIncrU, this.compartmentsRemovedU[i]);
                result.addNrmValue(+nrmIncrU, this.vaccinationModels[i].getCompartmentImmunizedU());

            }

        }

        this.vaccinationModels.forEach(vaccinationModel => {
            result.add(vaccinationModel.apply(state, dT, tT));
        });

        return result;

    }

    apply(state: IModelState, dT: number, tT: number): IModelState {

        const modificationTime = new ModificationTime({
            id: ObjectUtil.createId(),
            key: 'TIME',
            instant: tT,
            name: 'step',
            deletable: false,
            draggable: false
        });
        // triggers fetching of contact, testing and vaccination modifications
        modificationTime.setInstants(tT, tT); // tT, tT is by purpose, standing for instant, instant

        const result = this.applyVaccination(state, dT, tT, modificationTime.getDosesPerDay());

        this.strainModels.forEach(strainModel => {
            result.add(strainModel.apply(state, dT, tT, modificationTime));
        });

        return result;

    }


}
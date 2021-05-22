import { Demographics } from '../common/demographics/Demographics';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { Modifications } from './../common/modification/Modifications';
import { ObjectUtil } from './../util/ObjectUtil';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplIncidence } from './ModelImplIncidence';
import { ModelImplStrain } from './ModelImplStrain';
import { ModelImplVaccination } from './ModelImplVaccination';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { ModelStateIntegrator } from './state/ModelStateIntegrator';

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

    static async setupInstance(demographics: Demographics, modifications: Modifications): Promise<ModelStateIntegrator> {

        const minInstant = ModelConstants.MODEL_MIN_______________DATE;
        const maxInstant = minInstant + TimeUtil.MILLISECONDS_PER_DAY * ModelConstants.PRELOAD_________________DAYS;

        const ageGroupMultipliers: number[] = [];
        demographics.getAgeGroups().forEach(() => {
            ageGroupMultipliers.push(1);
        });
        let overallMultiplier = 1;

        const modificationsStrain = modifications.findAllApplicable(ModelConstants.MODEL_MIN_______________DATE, 'STRAIN');
        let initialIncidence = 0;
        modificationsStrain.forEach(modificationStrain => {
            initialIncidence += (modificationStrain as ModificationStrain).getModificationValues().incidence;
        });

        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;
        let vaccinationMultiplier = 1;

        let model = new ModelImplRoot(demographics, modifications, overallMultiplier, ageGroupMultipliers);
        let modelStateIntegrator: ModelStateIntegrator;

        for (let i = 0; i < 5; i++) {

            modelStateIntegrator = new ModelStateIntegrator(model);
            modelStateIntegrator.prefillVaccination(vaccinationMultiplier);

            const modelData = await modelStateIntegrator.buildModelData(demographics, minInstant, maxInstant, n => {});
            const lastDataItem = modelData[modelData.length - 1];
            const overallIncidence = lastDataItem.TOTAL_INCIDENCE;
            const overallVaccinated = lastDataItem.TOTAL_REMOVED_V;

            overallMultiplier *= initialIncidence / overallIncidence;
            demographics.getAgeGroups().forEach(ageGroup => {
                const ageGroupIncidence = lastDataItem[ageGroup.getName() + '_INCIDENCE'];
                const ageGroupOverallRatio = ageGroupIncidence / overallIncidence;
                ageGroupMultipliers[ageGroup.getIndex()] = ageGroupOverallRatio;
            });

            // adjust the vaccination multiplier to interpolate to a value that gives a closer match to desired settings
            vaccinationMultiplier *= modificationSettings.getVaccinated() / overallVaccinated;

            model = new ModelImplRoot(demographics, modifications, overallMultiplier, ageGroupMultipliers);

        }

        modelStateIntegrator = new ModelStateIntegrator(model);
        modelStateIntegrator.prefillVaccination(vaccinationMultiplier);
        for (let tT = minInstant; tT <= maxInstant; tT += ModelStateIntegrator.DT) {
            modelStateIntegrator.integrate(ModelStateIntegrator.DT, tT);
        }

        return modelStateIntegrator;

    }

    private readonly absTotal: number;
    private readonly valid: boolean;

    private readonly strainModels: ModelImplStrain[];
    private readonly compartmentsSusceptible: CompartmentBase[];
    private readonly compartmentsRemovedD: CompartmentBase[];
    private readonly compartmentsRemovedU: CompartmentBase[];

    /**
     * submodels with compartments for individuals vaccinated once and individuals vaccinated twice
     */
    private readonly vaccinationModels: ModelImplVaccination[];

    /**
     * 1) a one-day compartment of cases that incubated that day
     * 2) 6 more single day compartments to get a total of 7 -> 7-day incidence
     */
    private incidenceModels: ModelImplIncidence[];

    private constructor(demographics: Demographics, modifications: Modifications, overallMultiplier: number, ageGroupMultipliers: number[]) {

        this.strainModels = [];
        this.compartmentsSusceptible = [];
        this.compartmentsRemovedD = [];
        this.compartmentsRemovedU = [];
        this.vaccinationModels = [];
        this.incidenceModels = [];

        this.absTotal = demographics.getAbsTotal();

        const modificationsStrain = modifications.findAllApplicable(ModelConstants.MODEL_MIN_______________DATE, 'STRAIN');
        let initialIncidence = 0;
        modificationsStrain.forEach(modificationStrain => {
            initialIncidence += (modificationStrain as ModificationStrain).getModificationValues().incidence;
        });
        initialIncidence *= overallMultiplier;

        // TODO setup of initial exposed and infectious compartments may have to be adapted by multipliers
        modifications.findModificationsByType('STRAIN').forEach((modification: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modification.getModificationValues(), overallMultiplier, ageGroupMultipliers));
        });

        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;
        const settingsValues = modificationSettings.getModificationValues();

        demographics.getAgeGroups().forEach(ageGroup => {

            // TODO initial share of discovery (may split recovered slider)
            const absValueRemovedD = ageGroup.getAbsValue() * settingsValues.recoveredD;
            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R___REMOVED_D, this.absTotal, absValueRemovedD, ageGroup.getIndex(), CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            const absValueRemovedU = ageGroup.getAbsValue() * settingsValues.recoveredU;
            const compartmentRemovedU = new CompartmentBase(ECompartmentType.R___REMOVED_U, this.absTotal, absValueRemovedU, ageGroup.getIndex(), CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedU.push(compartmentRemovedU);

            this.incidenceModels.push(new ModelImplIncidence(this, demographics, initialIncidence * ageGroupMultipliers[ageGroup.getIndex()], ageGroup));

            const shareOfRefusal = 0.40 - 0.25 * ageGroup.getIndex() / demographics.getAgeGroups().length;
            const vaccinationModel = new ModelImplVaccination(this, demographics, ageGroup, shareOfRefusal);
            this.vaccinationModels.push(vaccinationModel);

            // console.log('vaccinationModel', vaccinationModel.getAgeGroupIndex(), vaccinationModel.getNrmRefusal() * vaccinationModel.getAbsTotal(), vaccinationModel.getNrmRefusal() * vaccinationModel.getAbsTotal() / vaccinationModel.getAgeGroupTotal());

        });

        // now find out how many people are already contained in compartments / by age group

        demographics.getAgeGroups().forEach(ageGroup => {

            const absValueSusceptible = ageGroup.getAbsValue() - this.getNrmValueGroup(ageGroup.getIndex(), true) * this.getAbsValue();
            const compartmentSusceptible = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.absTotal, absValueSusceptible, ageGroup.getIndex(), CompartmentChain.NO_CONTINUATION);
            this.compartmentsSusceptible.push(compartmentSusceptible);

            // this.pS = this.pN - this.pECov2 - this.pICov2 - this.pEB117 - this.pIB117 - this.pR;

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

    getIncidenceModel(ageGroupIndex: number): ModelImplIncidence {
        return this.incidenceModels[ageGroupIndex];
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

    getAbsTotal(): number {
        return this.absTotal;
    }

    getNrmValue(): number {
        return 1;
    }

    getAbsValue(): number {
        return this.absTotal;
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
        this.incidenceModels.forEach(incidenceModel => {
            initialState.add(incidenceModel.getInitialState());
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
        });
        // triggers fetching of contact, testing and vaccination modifications
        modificationTime.setInstants(tT, tT); // tT, tT is by purpose, standing for instant, instant

        const result = this.applyVaccination(state, dT, tT, modificationTime.getDosesPerDay());

        this.strainModels.forEach(strainModel => {
            result.add(strainModel.apply(state, dT, tT, modificationTime));
        });
        this.incidenceModels.forEach(incidenceModel => {
            result.add(incidenceModel.apply(state, dT, tT));
        });


        return result;

    }


}
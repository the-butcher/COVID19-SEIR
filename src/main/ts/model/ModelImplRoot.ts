import { StrainUtil } from './../util/StrainUtil';
import { Logger } from './../util/Logger';
import { BaseData, IBaseDataItem } from './incidence/BaseData';
import { Demographics } from '../common/demographics/Demographics';
import { ModificationSettings } from '../common/modification/ModificationSettings';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { ModificationTesting } from '../common/modification/ModificationTesting';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { ModificationContact } from './../common/modification/ModificationContact';
import { Modifications } from './../common/modification/Modifications';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplStrain } from './ModelImplStrain';
import { ModelImplVaccination } from './ModelImplVaccination';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './state/ModelStateIntegrator';

interface IVaccinationGroupData {
    nrmVaccS: number; // susceptible - vaccination of susceptible population
    nrmVaccD: number; // discovered - vaccination of cases previously discovered -> 1 shot
    nrmVaccU: number; // undiscovered - vaccination of cases previously undiscovered -> 2 shots
    nrmTotal: number;
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

        const ageGroups = demographics.getAgeGroups();

        /**
         * start at minus preload days
         */
        const curInstant = ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;
        const referenceDataRemoved = baseData.findBaseData(TimeUtil.formatCategoryDate(curInstant));

        /**
         * get all strain values as currently in modifications instance
         */
        const modificationsStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m as ModificationStrain);
        const modificationTime = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'straintime',
            instant: curInstant,
            key: 'TIME',
            name: 'straintime',
            deletable: true,
            draggable: true
        }) as ModificationTime;
        modificationTime.setInstants(curInstant, curInstant);

        const modificationContact = Modifications.getInstance().findModificationsByType('CONTACT')[0] as ModificationContact;
        const modificationValueContact = modificationContact.getModificationValues();
        const modificationTesting = Modifications.getInstance().findModificationsByType('TESTING')[0] as ModificationTesting;
        const modificationValueTesting = modificationTesting.getModificationValues();

        modificationValueContact.instant = curInstant;
        modificationValueTesting.instant = curInstant;

        const heatmapIncidences00 = ageGroups.map(g => 0);
        const heatmapIncidencesP7 = ageGroups.map(g => 0);
        // const heatmapReproductions = ageGroups.map(g => 0);
        const minOffsetIndex = -2;
        const maxOffsetIndex = 3;
        const difOffsetIndex = maxOffsetIndex - minOffsetIndex;
        for (let offsetIndex = minOffsetIndex; offsetIndex < maxOffsetIndex; offsetIndex++) {

            const instantM7 = curInstant + (offsetIndex - 7) * TimeUtil.MILLISECONDS_PER____DAY;
            const instant00 = curInstant + (offsetIndex) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantP7 = curInstant + (offsetIndex + 7) * TimeUtil.MILLISECONDS_PER____DAY;

            ageGroups.forEach(ageGroup => {

                const casesM7 = baseData.findBaseData(TimeUtil.formatCategoryDate(instantM7))[ageGroup.getName()];
                const cases00 = baseData.findBaseData(TimeUtil.formatCategoryDate(instant00))[ageGroup.getName()];
                const casesP7 = baseData.findBaseData(TimeUtil.formatCategoryDate(instantP7))[ageGroup.getName()];

                const heatmapIncidence00 = (cases00 - casesM7) * 100000 / ageGroup.getAbsValue();
                const heatmapIncidenceP7 = (casesP7 - cases00) * 100000 / ageGroup.getAbsValue();

                heatmapIncidences00[ageGroup.getIndex()] += heatmapIncidence00 / difOffsetIndex;
                heatmapIncidencesP7[ageGroup.getIndex()] += heatmapIncidenceP7 / difOffsetIndex;

            });

        }
        // console.log('heatmapIncidences', heatmapIncidences00, heatmapIncidencesP7);


        const instant00 = curInstant
        const instantP7 = curInstant + 7 * TimeUtil.MILLISECONDS_PER____DAY;;
        for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

            const strainIncidences = [...heatmapIncidences00];

            const strainReproductions: number[] = [];
            ageGroups.forEach(ageGroup => {
                strainReproductions.push(StrainUtil.calculateR0(heatmapIncidences00[ageGroup.getIndex()], heatmapIncidencesP7[ageGroup.getIndex()], instant00, instantP7,  modificationsStrain[strainIndex].getSerialInterval() *  modificationsStrain[strainIndex].getIntervalScale()));
            });

            modificationsStrain[strainIndex].acceptUpdate({
                incidences: strainIncidences,
                reproduction: strainReproductions
            });
            console.log('targetIndices', modificationsStrain[strainIndex].getName(), strainIncidences, strainReproductions);

        }

        /**
         * some interpolation runs
         */
        let model: ModelImplRoot;
        let modelStateIntegrator: ModelStateIntegrator;
        // for (let interpolationIndex = 0; interpolationIndex < 0; interpolationIndex++) {

        //     model = new ModelImplRoot(demographics, modifications, referenceDataRemoved, baseData);
        //     modelStateIntegrator = new ModelStateIntegrator(model, curInstant);
        //     modelStateIntegrator.prefillVaccination();

        //     let modelData: IDataItem[];
        //     let lastDataItem: IDataItem;
        //     let dstInstant = -1;
        //     for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

        //         // if the strain identified by index has a date later than the last model iteration -> step forward until incidence reached
        //         if (modificationsStrain[strainIndex].getInstantA() > dstInstant) {
        //             dstInstant = modificationsStrain[strainIndex].getInstantA();
        //             modelData = await modelStateIntegrator.buildModelData(dstInstant, curInstant => curInstant === dstInstant, modelProgress => {
        //                 progressCallback({
        //                     ratio: modelProgress.ratio
        //                 });
        //             });
        //             lastDataItem = modelData[modelData.length - 1];
        //         }

        //         const incidences = modificationsStrain[strainIndex].getModificationValues().incidences;
        //         ageGroups.forEach(ageGroup => {

        //             // source model value
        //             const ageGroupIncidenceSource = lastDataItem.valueset[ageGroup.getName()].INCIDENCES[modificationsStrain[strainIndex].getId()];

        //             const ageGroupIncidenceTarget = targetIncidences[strainIndex][ageGroup.getIndex()];


        //             // factor from source to target
        //             const ageGroupIncidenceFactor = ageGroupIncidenceTarget / ageGroupIncidenceSource;

        //             // console.log(ageGroupIncidenceSource, ageGroupIncidenceTarget, ageGroupIncidenceFactor);

        //             incidences[ageGroup.getIndex()] *= ageGroupIncidenceFactor;

        //         });
        //         // console.log('modifiers', modifiers, ageGroupSourceIncidences, ageGroupTargetIncidences);

        //         modificationsStrain[strainIndex].acceptUpdate({
        //             incidences
        //         });
        //         // console.log(modifiersSP, modifiersSM);

        //     };

        //     // const vaccinatedModel = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].REMOVED_V;
        //     // const vaccinatedFactor = vaccinatedTarget / vaccinatedModel;
        //     // const vaccinated = modificationSettings.getVaccinated() * vaccinatedFactor;

        //     // modificationSettings.acceptUpdate({
        //     //     vaccinated
        //     // });

        // }

        /**
         * final model setup with adapted modifications values
         * since the model contains the preload portion, that portion is fast forwarded and the state-integrator is returned being positioned at model-start instant
         */
        model = new ModelImplRoot(demographics, Modifications.getInstance(), referenceDataRemoved, baseData);
        modelStateIntegrator = new ModelStateIntegrator(model, curInstant);
        modelStateIntegrator.prefillVaccination();
        // await modelStateIntegrator.buildModelData(ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY, () => false, () => {});
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

            const absValueRemovedD = referenceDataRemoved[ageGroup.getName()];
            const absValueRemovedU = absValueRemovedD * modificationSettings.getUndetected();

            // TODO initial share of discovery (may split recovered slider)
            // const absValueRemovedD = ageGroup.getAbsValue() * settingsValues.recoveredD;
            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R___REMOVED_D, this.demographics.getAbsTotal(), absValueRemovedD, ageGroup.getIndex(), ModelConstants.STRAIN_ID_____ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            // const absValueRemovedU = ageGroup.getAbsValue() * settingsValues.recoveredU;
            const compartmentRemovedU = new CompartmentBase(ECompartmentType.R___REMOVED_U, this.demographics.getAbsTotal(), absValueRemovedU, ageGroup.getIndex(), ModelConstants.STRAIN_ID_____ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedU.push(compartmentRemovedU);

            // configurable
            const shareOfRefusal = 0.40 - 0.25 * ageGroup.getIndex() / demographics.getAgeGroups().length;
            const vaccinationModel = new ModelImplVaccination(this, demographics, ageGroup, shareOfRefusal);
            this.vaccinationModels.push(vaccinationModel);

            // console.log('vaccinationModel', vaccinationModel.getAgeGroupIndex(), vaccinationModel.getNrmRefusal() * vaccinationModel.getAbsTotal(), vaccinationModel.getNrmRefusal() * vaccinationModel.getAbsTotal() / vaccinationModel.getAgeGroupTotal());

        });

        // now find out how many people are already contained in compartments / by age group
        demographics.getAgeGroups().forEach(ageGroup => {
            const absValueSusceptible = ageGroup.getAbsValue() - this.getNrmValueGroup(ageGroup.getIndex(), true) * this.getAbsValue();
            const compartmentSusceptible = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.demographics.getAbsTotal(), absValueSusceptible, ageGroup.getIndex(), ModelConstants.STRAIN_ID_____ALL, CompartmentChain.NO_CONTINUATION);
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
        return [this.compartmentsSusceptible[ageGroupIndex], this.vaccinationModels[ageGroupIndex].getCompartmentImmunizing()];
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
        // no initial vaccination value, model initializes, prefills with vaccination
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

    applyVaccination(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

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

        const nrmDosesTotal = modificationTime.getDosesPerDay() * dT / TimeUtil.MILLISECONDS_PER____DAY / this.getAbsTotal();
        for (let i = 0; i < this.vaccinationModels.length; i++) {

            // create a share of doses for this age group
            const nrmDosesAgeGroup = nrmDosesTotal * vaccinationGroupDataset[i].nrmTotal / totalVaccinationPriority; // divide by two to simulate 2 shots
            if (nrmDosesAgeGroup > 0) {

                const nrmTotal = this.vaccinationModels[i].getGroupPriority() > 0 ? vaccinationGroupDataset[i].nrmTotal / this.vaccinationModels[i].getGroupPriority() : 0;

                // // distribute share to
                const nrmIncrS = nrmDosesAgeGroup * vaccinationGroupDataset[i].nrmVaccS / nrmTotal;
                const nrmIncrD = nrmDosesAgeGroup * vaccinationGroupDataset[i].nrmVaccD / nrmTotal;
                const nrmIncrU = nrmDosesAgeGroup * vaccinationGroupDataset[i].nrmVaccU / nrmTotal;

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

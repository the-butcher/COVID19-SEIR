import { IAnyModificationValue } from './../client/controls/StorageUtil';
import { IModificationValuesContact } from './../common/modification/IModificationValuesContact';
import { IModificationValues } from './../common/modification/IModificationValues';
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
import { CompartmentFilter } from './compartment/CompartmentFilter';
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
    static async setupInstance(demographics: Demographics, modificationValues: IModificationValues[], progressCallback: (progress: IModelProgress) => void): Promise<ModelStateIntegrator> {

        const ageGroups = demographics.getAgeGroups();

        /**
         * start at minus preload days
         */
        const curInstant = ModelConstants.MODEL_MIN_____INSTANT; // - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;

        /**
         * start with some default
         */
        let transmissionRisk = 0.065;
        let incidence = 150;

        const modifiers = ageGroups.map(g => incidence);
        const modificationValuesCalibrate: IAnyModificationValue[] = [
            {
                id: 'calibrate (seasonality)',
                key: 'SEASONALITY',
                name: 'calibrate (seasonality)',
                instant: new Date('2021-07-10').getTime(),
                seasonality: 1.00,
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (strain)',
                key: 'STRAIN',
                name: 'calibrate (strain)',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                r0: 1,
                serialInterval: 4.8,
                intervalScale: 1,
                incidence,
                modifiers,
                transmissionRisk,
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (contact)',
                key: 'CONTACT',
                name: 'calibrate (contact)',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                multipliers: {},
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (testing)',
                key: 'TESTING',
                name: 'calibrate (testing)',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                multipliers: {
                    'family': 1.00,
                    'school': 1.00,
                    'nursing': 1.00,
                    'work': 1.00,
                    'other': 1.00
                },
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (settings)',
                key: 'SETTINGS',
                name: 'calibrate (settings)',
                instant: ModelConstants.MODEL_MIN_____INSTANT,
                recoveredD: 0.0,
                recoveredU: 0.0,
                quarantine: 0.0,
                dead: 0.0,
                vaccinated: 0.0,
                deletable: false,
                draggable: false
            },
            {
                id: 'calibrate (time)',
                key: 'TIME',
                name: 'calibrate (time)',
                instant: curInstant,
                deletable: false,
                draggable: false
            }
        ];
        Modifications.setInstanceFromValues(modificationValuesCalibrate);
        const modificationStrainCalibrate = Modifications.getInstance().findModificationsByType('STRAIN')[0] as ModificationStrain;

        const modificationTimeCalibrate = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'calibrate (time)',
            key: 'TIME',
            name: 'calibrate (time)',
            instant: curInstant,
            deletable: false,
            draggable: false
        }) as ModificationTime;
        modificationTimeCalibrate.setInstants(curInstant, curInstant);

        let model: ModelImplRoot = null;
        let modelStateIntegrator: ModelStateIntegrator;

        for (let interpolationIndex = 0; interpolationIndex < 20; interpolationIndex++) {

            model = new ModelImplRoot(demographics, Modifications.getInstance());
            modelStateIntegrator = new ModelStateIntegrator(model, curInstant);

            const modelState = modelStateIntegrator.getModelState();
            const strainModel = model.findStrainModel('calibrate (strain)');

            strainModel.apply(modelState, ModelStateIntegrator.DT, ModelConstants.MODEL_MIN_____INSTANT, modificationTimeCalibrate);

            const absDeltas = strainModel.getAbsDeltas();
            let absDeltaAvg = 0;
            for (let i = 0; i < absDeltas.length; i++) {
                modifiers[i] /= absDeltas[i];
                absDeltaAvg += absDeltas[i];
            }
            absDeltaAvg /= absDeltas.length;

            transmissionRisk *= absDeltaAvg;

            const compartmentFilterIncidenceTotal = new CompartmentFilter(c => (c.getCompartmentType() === ECompartmentType.X__INCUBATE_0 || c.getCompartmentType() === ECompartmentType.X__INCUBATE_N));
            const modelIncidence = modelState.getNrmValueSum(compartmentFilterIncidenceTotal) * demographics.getAbsTotal() * 100000 / demographics.getAbsTotal();

            const incidenceCorrection = incidence / modelIncidence;
            for (let i = 0; i < modifiers.length; i++) {
                modifiers[i] *= incidenceCorrection;
            }

            modificationStrainCalibrate.acceptUpdate({
                incidence,
                modifiers,
                transmissionRisk
            });

            // console.log('strainModel', strainModel, strainModel.getAbsDeltas(), modifiers, incidenceCorrection, incidence, transmissionRisk);

        }
        // console.log('strainModel', modifiers, transmissionRisk);


        /**
         * get all strain values as currently in modifications instance
         */
        Modifications.setInstanceFromValues(modificationValues);
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
        const modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;

        modificationValueContact.instant = curInstant;
        modificationValueTesting.instant = curInstant;

        // const vaccinatedTarget = modificationSettings.getVaccinated();
        // const recoveredDTarget = modificationSettings.getRecoveredD();
        // const recoveredUTarget = modificationSettings.getRecoveredU();

        for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {
            modificationsStrain[strainIndex].acceptUpdate({
                incidence,
                modifiers,
                transmissionRisk
            });
        }


        // /**
        //  * 5 interpolation runs
        //  */
        // for (let interpolationIndex = 0; interpolationIndex < 0; interpolationIndex++) {

        //     model = new ModelImplRoot(demographics, modifications);
        //     modelStateIntegrator = new ModelStateIntegrator(model, curInstant);
        //     modelStateIntegrator.prefillVaccination();

        //     let modelData: IDataItem[];
        //     let lastDataItem: IDataItem;
        //     let dstInstant = -1;
        //     for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

        //         // if the strain identified by index has a date later than the last model iteration
        //         if (modificationsStrain[strainIndex].getInstantA() > dstInstant) {
        //             dstInstant = modificationsStrain[strainIndex].getInstantA();
        //             modelData = await modelStateIntegrator.buildModelData(dstInstant, curInstant => curInstant === dstInstant, modelProgress => {
        //                 progressCallback({
        //                     ratio: modelProgress.ratio
        //                 });
        //             });
        //             lastDataItem = modelData[modelData.length - 1];
        //         }

        //         // source model value
        //         const totalIncidenceSource = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].INCIDENCES[modificationsStrain[strainIndex].getId()];

        //         // target model value
        //         const totalIncidenceTarget = incidences[modificationsStrain[strainIndex].getName()].overall;

        //         // factor from source to target
        //         const totalIncidenceFactor = totalIncidenceTarget / totalIncidenceSource;

        //         // multiply current setting by factor for better approximation
        //         const totalIncidenceResume = modificationsStrain[strainIndex].getIncidence() * totalIncidenceFactor;

        //         const ageGroupIncidencesResume: number[] = [];
        //         ageGroups.forEach(ageGroup => {

        //             // value as in model
        //             const ageGroupIncidenceSource = lastDataItem.valueset[ageGroup.getName()].INCIDENCES[modificationsStrain[strainIndex].getId()];

        //             // age group value in relation to total value
        //             const ageGroupIncidenceFactor = ageGroupIncidenceSource / totalIncidenceSource;

        //             // multiplied with total incidence factor
        //             const ageGroupIncidenceResume = totalIncidenceResume * ageGroupIncidenceFactor;
        //             ageGroupIncidencesResume.push(ageGroupIncidenceResume);

        //         });

        //         modificationsStrain[strainIndex].acceptUpdate({
        //             incidence: totalIncidenceResume,
        //             modifiers: ageGroupIncidencesResume
        //         });

        //     };

        //     const recoveredDModel = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].REMOVED_D;
        //     const recoveredDFactor = recoveredDTarget / recoveredDModel;
        //     const recoveredD = modificationSettings.getRecoveredD() * recoveredDFactor;

        //     const recoveredUModel = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].REMOVED_U;
        //     const recoveredUFactor = recoveredUTarget / recoveredUModel;
        //     const recoveredU = modificationSettings.getRecoveredU() * recoveredUFactor;

        //     const vaccinatedModel = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].REMOVED_V;
        //     const vaccinatedFactor = vaccinatedTarget / vaccinatedModel;
        //     const vaccinated = modificationSettings.getVaccinated() * vaccinatedFactor;

        //     // adjust the vaccination multiplier to interpolate to a value that gives a closer match to desired settings
        //     // vaccinationMultiplier *= modificationSettings.getVaccinated() / overallVaccinated;
        //     // removalDMultiplier *= modificationSettings.getRecoveredU() /
        //     modificationSettings.acceptUpdate({
        //         recoveredU,
        //         recoveredD,
        //         vaccinated
        //     });

        // }

        /**
         * final model setup with adapted modifications values,
         * integrate to match model start date
         */
        model = new ModelImplRoot(demographics, Modifications.getInstance());
        modelStateIntegrator = new ModelStateIntegrator(model, curInstant);
        modelStateIntegrator.prefillVaccination();
        // await modelStateIntegrator.buildModelData(ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY, () => false, () => {});

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

        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;
        const settingsValues = modificationSettings.getModificationValues();

        const modificationTesting = modifications.findModificationsByType('TESTING')[0] as ModificationTesting;
        // const testingValues = modificationSettings.getModificationValues();

        this.demographics = demographics;
        modifications.findModificationsByType('STRAIN').forEach((modificationStrain: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modificationStrain.getModificationValues(), modificationTesting));
        });

        demographics.getAgeGroups().forEach(ageGroup => {

            // TODO initial share of discovery (may split recovered slider)
            const absValueRemovedD = ageGroup.getAbsValue() * settingsValues.recoveredD;
            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R___REMOVED_D, this.demographics.getAbsTotal(), absValueRemovedD, ageGroup.getIndex(), ModelConstants.STRAIN_ID_____ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            const absValueRemovedU = ageGroup.getAbsValue() * settingsValues.recoveredU;
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
import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
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
import { CompartmentImmunity } from './compartment/CompartmentImmunity';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplStrain } from './ModelImplStrain';
import { ModelImplVaccination } from './ModelImplVaccination';
import { ModelInstants } from './ModelInstants';
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

    private readonly compartmentsSusceptible: CompartmentImmunity[];

    /**
     * helper collection to avaoid reassembling arrays repeatedly
     */
    private readonly compartmentsImmunity: CompartmentImmunity[][][];

    /**
     * submodels with compartments for individuals vaccinated once and individuals vaccinated twice
     */
    private readonly vaccinationModels: ModelImplVaccination[];

    constructor(demographics: Demographics, modifications: Modifications, referenceDataRemoved: IBaseDataItem, baseData: BaseData) {

        this.strainModels = [];
        this.compartmentsSusceptible = [];
        this.compartmentsImmunity = [];
        this.vaccinationModels = [];

        const modificationTime = modifications.findModificationsByType('TIME')[0] as ModificationTime;
        modificationTime.setInstants(ModelInstants.getInstance().getPreInstant(), ModelInstants.getInstance().getPreInstant());
        const modificationSettings = modifications.findModificationsByType('SETTINGS')[0] as ModificationSettings;

        this.demographics = demographics;
        modifications.findModificationsByType('STRAIN').forEach((modificationStrain: ModificationStrain) => {
            this.strainModels.push(new ModelImplStrain(this, demographics, modificationStrain.getModificationValues(), modificationTime, referenceDataRemoved));
        });

        let groupRatios: number[] = [
            // 1.000,
            // 0.500, // 05-14
            // 0.475, // 15-24
            // 0.450, // 25-34
            // 0.425, // 35-44
            // 0.400, // 45-55
            // 0.350, // 55-65
            // 0.350, // 65-74
            // 0.325, // 75-84
            // 0.300  // >= 85
            1.000,
            0.600, // 05-14
            0.550, // 15-24
            0.550, // 25-34
            0.525, // 35-44
            0.500, // 45-55
            0.400, // 55-65
            0.400, // 65-74
            0.400, // 75-84
            0.400  // >= 85
        ];

        demographics.getAgeGroups().forEach(ageGroup => {

            // start with full population of respective group
            let absValueSusceptible = ageGroup.getAbsValue()
            this.strainModels.forEach(strainModel => {
                // subtract anything that may be in any infection model state
                absValueSusceptible -= strainModel.getNrmValueGroup(ageGroup.getIndex()) * this.getAbsTotal();
            });

            const vaccinationConfig = modificationTime.getVaccinationConfig2(ageGroup.getName());

            let grpRatio = groupRatios[ageGroup.getIndex()]; // 0.45 + grpOffset * 0.07;

            const grpValueV2 = vaccinationConfig.v2 * grpRatio;

            let absValueV2 = grpValueV2 * ageGroup.getAbsValue();
            absValueSusceptible -= absValueV2;

            const vaccinationModel = new ModelImplVaccination(this, demographics, modificationTime, absValueV2 * 0.15, absValueV2 * 0.85, ageGroup);
            this.vaccinationModels.push(vaccinationModel);

            const compartmentSusceptible = new CompartmentImmunity(ECompartmentType.S__SUSCEPTIBLE, this.demographics.getAbsTotal(), absValueSusceptible, ageGroup.getIndex(), ageGroup.getName(), ModelConstants.STRAIN_ID___________ALL, 0, CompartmentChainReproduction.NO_CONTINUATION, '');
            this.compartmentsSusceptible.push(compartmentSusceptible);

        });

    }

    getStepCases(ageGroupIndex: number): number {
        let stepCases = 0;
        this.strainModels.forEach(strainModel => {
            stepCases += strainModel.getStepCases(ageGroupIndex);
        })
        return stepCases;
    }

    findStrainModel(strainId: string): ModelImplStrain {
        return this.strainModels.find(m => m.getStrainId() === strainId);
    }

    getRootModel(): ModelImplRoot {
        return this;
    }

    getCompartmentSusceptible(ageGroupIndex: number): CompartmentBase {
        return this.compartmentsSusceptible[ageGroupIndex];
    }


    getCompartmentsSusceptible(ageGroupIndex: number, strainValues: IModificationValuesStrain): CompartmentImmunity[] {

        /**
         * container for this age groups
         */
        if (!this.compartmentsImmunity[ageGroupIndex]) {
            this.compartmentsImmunity[ageGroupIndex] = [];
        }

        /**
         * specific strain and age group
         */
        if (!this.compartmentsImmunity[ageGroupIndex][strainValues.id]) {

            this.compartmentsImmunity[ageGroupIndex][strainValues.id] = [];
            this.compartmentsImmunity[ageGroupIndex][strainValues.id].push(this.compartmentsSusceptible[ageGroupIndex]);
            for (let strainIndex = 0; strainIndex < this.strainModels.length; strainIndex++) {

                const strainModel = this.strainModels[strainIndex];
                const strainEscape = strainValues.strainEscape[strainModel.getStrainId()];
                if (strainEscape > 0) {
                    this.compartmentsImmunity[ageGroupIndex][strainValues.id].push(...strainModel.getRecoveryModel(ageGroupIndex).getCompartments());
                } else {
                    //console.log('skipping', strainValues.name, strainModel.getStrainId());
                    // break on
                    // only consider strains that appeared earlier (which may not be correct, but for the sake of simplicity and performance should be ok)
                    // break;
                }

            }
            this.compartmentsImmunity[ageGroupIndex][strainValues.id].push(...this.vaccinationModels[ageGroupIndex].getCompartments()); // the full compartment chain
            this.compartmentsImmunity[ageGroupIndex][strainValues.id].push(this.vaccinationModels[ageGroupIndex].getCompartmentI()); // the immunizing compartment

        }

        return this.compartmentsImmunity[ageGroupIndex][strainValues.id];

    }

    getNrmValueGroup(ageGroupIndex: number): number {
        console.error('nrm val group called on root');
        let nrmValueGroup = 0;
        nrmValueGroup += this.compartmentsSusceptible[ageGroupIndex].getNrmValue();
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
        for (let i = 0; i < this.vaccinationModels.length; i++) {

            /**
             * threshold value that keeps compartments from intersecting and doing strange things
             */
            // const minRemain = 500 / this.vaccinationModels[i].getAgeGroupTotal();
            const vaccinationsPerDay = modificationTime.getVaccinationConfig2(this.vaccinationModels[i].getAgeGroupName());

            /**
             * vaccination to be added in this step (group percent)
             */
            const grpJab1T = vaccinationsPerDay.d1 * dT / TimeUtil.MILLISECONDS_PER____DAY;
            const grpJab2T = vaccinationsPerDay.d2 * dT / TimeUtil.MILLISECONDS_PER____DAY;
            const grpJab3T = vaccinationsPerDay.d3 * dT / TimeUtil.MILLISECONDS_PER____DAY;
            const grpJab4T = vaccinationsPerDay.d4 * dT / TimeUtil.MILLISECONDS_PER____DAY;

            const nrmJab1T = grpJab1T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();
            const nrmJab2T = grpJab2T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();
            const nrmJab3T = grpJab3T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();
            const nrmJab4T = grpJab4T * this.vaccinationModels[i].getAgeGroupTotal() / this.getAbsTotal();

            // const nrmJabBTval = nrmJab3T + nrmJab4T;
            const nrmJabIT = nrmJab1T + nrmJab2T + nrmJab3T + nrmJab4T;

            /**
             * assumptions about 1st dose
             */
            const nrmJab1Tmax = state.getNrmValue(this.compartmentsSusceptible[i]); // Math.max(minRemain, state.getNrmValue(this.compartmentsSusceptible[i])) - minRemain; // susceptible to immunizing
            const nrmJab1Tval = Math.min(nrmJab1Tmax, nrmJabIT);

            /**
             * assumptions about 2nd dose
             */
            // const nrmJab2Tmax = state.getNrmValue(this.vaccinationModels[i].getCompartmentI()); // Math.max(minRemain, state.getNrmValue(this.vaccinationModels[i].getFirstCompartment())) - minRemain; // immunizing to vaccinated (regular second shot)
            // const nrmJab2Tval = Math.min(nrmJab2Tmax, nrmJab2T); // nrmValueVI !== 0 ? nrmJab2T : 0;

            result.addNrmValue(-nrmJab1Tval, this.compartmentsSusceptible[i]);
            result.addNrmValue(+nrmJab1Tval, this.vaccinationModels[i].getCompartmentI());

            const continuationValue = this.vaccinationModels[i].getCompartmentI().getContinuationRatio().getRate(dT, tT) * state.getNrmValue(this.vaccinationModels[i].getCompartmentI());
            result.addNrmValue(-continuationValue, this.vaccinationModels[i].getCompartmentI());
            result.addNrmValue(+continuationValue, this.vaccinationModels[i].getFirstCompartment());


            // result.addNrmValue(-nrmJab2Tval, this.vaccinationModels[i].getCompartmentI());
            // result.addNrmValue(+nrmJab2Tval, this.vaccinationModels[i].getFirstCompartment());

            // // v3 (TODO: find out if the time to re-gain immunity is significant and needs to be modelled)
            // result.addNrmValue(-nrmJabBTval, this.compartmentsSusceptible[i]);
            // result.addNrmValue(+nrmJabBTval, this.vaccinationModels[i].getFirstCompartment());

        }

        return result;

    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = this.applyVaccination(state, dT, tT, modificationTime);
        // result.add(this.applyLossOfImmunity(state, dT, tT, modificationTime)); // TODO :: add a series of recovery chains to each strain (so some strains can hold immunity shorter or longer than others)
        this.vaccinationModels.forEach(vaccinationModel => {
            result.add(vaccinationModel.apply(state, dT, tT, modificationTime));
        });
        this.strainModels.forEach(strainModel => {
            result.add(strainModel.apply(state, dT, tT, modificationTime));
        });
        // console.log('res', result.getNrmValueSum(new CompartmentFilter(c => c.getCompartmentType() != ECompartmentType.X__INCIDENCE_0 && c.getCompartmentType() != ECompartmentType.X__INCIDENCE_N)) * this.getAbsTotal());
        return result;
    }

}

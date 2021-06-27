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
        const instantPre = ModelInstants.getInstance().getMinInstant() - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;

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

            const absValueRemovedD = referenceDataRemoved[ageGroup.getName()][ModelConstants.BASE_DATA_INDEX_REMOVED];
            const absValueRemovedU = absValueRemovedD * modificationSettings.getUndetected();

            const compartmentRemovedD = new CompartmentBase(ECompartmentType.R__REMOVED_ID, this.demographics.getAbsTotal(), absValueRemovedD, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedD.push(compartmentRemovedD);

            const compartmentRemovedU = new CompartmentBase(ECompartmentType.R__REMOVED_IU, this.demographics.getAbsTotal(), absValueRemovedU, ageGroup.getIndex(), ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
            this.compartmentsRemovedU.push(compartmentRemovedU);

            // configurable
            const vaccinationModel = new ModelImplVaccination(this, demographics, ageGroup);
            this.vaccinationModels.push(vaccinationModel);

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

        // const eT = tT - new Date('2021-02-01').getTime();
        const oTX = new Date('2021-02-08').getTime(); // ref vaccination start
        const oTD = 310 * TimeUtil.MILLISECONDS_PER____DAY; // priority buildup time

        const groupDelayWeeks: number[] = [
            19, // >= 04
            19, // 05-14
            12.0, // 15-24
            12.0, // 25-34
            13.0, // 35-44
            13.0, // 45-54
            14.9, // 55-64
            14.0, // 65-74
            12.2, // 75-84
            12.9  // >= 85
        ].map(v => v * 7 * TimeUtil.MILLISECONDS_PER____DAY);

        const fullPriorities: number[] = [
            1, // >= 04
            1, // 05-14
            1, // 15-24
            2, // 25-34
            4, // 35-44
            4, // 45-54
            150, // 55-64
            750, // 65-74
            80, // 75-84
            80 // >= 85
        ];

        const groupPriorities: number[] = [];

        for (let i = 0; i < this.vaccinationModels.length; i++) {

            // risk prio to that point
            const oTA = oTX + groupDelayWeeks[i];
            const oTB = oTA + oTD;


            let grpPrio = 0;
             if (tT > oTA && tT < oTB) {
                grpPrio += fullPriorities[i] * (tT - oTA) / (oTB - oTA);

            } else if (tT > oTB) {
                grpPrio = fullPriorities[i];
            }
            groupPriorities.push(grpPrio);

            // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0) {
            //     console.log('vacS', TimeUtil.formatCategoryDate(tT), i, new Date(oTB), groupPriorities[i]);
            // }

        }






        // collect a total vaccination priority
        const vaccinationGroupDataset: IVaccinationGroupData[] = [];

        for (let i = 0; i < this.vaccinationModels.length; i++) {

            /**
             * maximum percentage that this age-groups accepts (by configuration)
             */
            // const grpVacMax = this.vaccinationModels[i].getGrpAccept();
            const grpVacMax = this.vaccinationModels[i].getGrpAccept();

            if (grpVacMax > 0) {

                let grpVacD = state.getNrmValue(this.vaccinationModels[i].getCompartmentImmunizedD());
                let grpMaxD = grpVacMax * (grpVacD + state.getNrmValue(this.compartmentsRemovedD[i]));
                grpVacD *= this.getAbsTotal() / this.vaccinationModels[i].getAgeGroupTotal(); // currently vaccinated after symptomatic recovery (percentage of group)
                grpMaxD *= this.getAbsTotal() / this.vaccinationModels[i].getAgeGroupTotal(); // all after symptomatic recovery vaccinated or not (percentage of group)

                let grpDifD = grpMaxD - grpVacD;
                let grpFacD = grpDifD / grpMaxD; // percentage of people that are currently vaccinated among symptomatic recovery (with respect to max possible vaccinated)
                let nrmDifD = 0;
                if (grpDifD > 0) {
                    nrmDifD = grpDifD / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();
                }

                let grpVacU = state.getNrmValue(this.vaccinationModels[i].getCompartmentImmunizedU());
                let grpMaxU = grpVacMax * (grpVacU + state.getNrmValue(this.compartmentsRemovedU[i]));
                grpVacU *= this.getAbsTotal() / this.vaccinationModels[i].getAgeGroupTotal(); // currently vaccinated after asymptomatic recovery (percentage of group)
                grpMaxU *= this.getAbsTotal() / this.vaccinationModels[i].getAgeGroupTotal(); // all after asymptomatic recovery vaccinated or not (percentage of group)

                let grpDifU = grpMaxU - grpVacU;
                let grpFacU = grpDifU / grpMaxU; // percentage of people that are currently vaccinated among asymptomatic recovery (with respect to max possible vaccinated)
                let nrmDifU = 0;
                if (grpDifU > 0) {
                    nrmDifU = grpDifU / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();
                }

                let grpVacS = 0; // currently vaccinated in this group (percentage of group)
                grpVacS += state.getNrmValue(this.vaccinationModels[i].getCompartmentImmunizing());
                grpVacS += state.getNrmValue(this.vaccinationModels[i].getCompartmentImmunizedS());
                let grpMaxS = grpVacMax * (grpVacS + state.getNrmValue(this.compartmentsSusceptible[i]));
                grpVacS *= this.getAbsTotal() / this.vaccinationModels[i].getAgeGroupTotal(); // currently vaccinated after asymptomatic recovery (percentage of group)
                grpMaxS *= this.getAbsTotal() / this.vaccinationModels[i].getAgeGroupTotal(); // all after asymptomatic recovery vaccinated or not (percentage of group)

                let grpDifS = grpMaxS - grpVacS
                let grpFacS = grpDifS / grpMaxS; // percentage of people that are currently vaccinated amon recovered (with respect to max possible vaccinated)
                let nrmDifS = 0;
                if (grpDifS > 0) {
                    nrmDifS = grpDifS / this.getAbsTotal() * this.vaccinationModels[i].getAgeGroupTotal();
                }

                // const shareOfSusceptible =

                let nrmReqS = groupPriorities[i] * Math.max(0, nrmDifS * grpFacS); // * 2

                const nrmShrS = nrmReqS / grpMaxS; // the share just requested from susceptible
                let nrmReqD = nrmShrS * state.getNrmValue(this.compartmentsRemovedU[i]);
                let nrmReqU = nrmShrS * state.getNrmValue(this.compartmentsRemovedD[i]);


                // let nrmReqD = groupPriorities[i] * Math.max(0, nrmDifD * grpFacD);
                // let nrmReqU = groupPriorities[i] * Math.max(0, nrmDifU * grpFacU * 2); // * 2 // grpFacU

                vaccinationGroupDataset.push({
                    nrmReqS,
                    nrmReqD,
                    nrmReqU
                });

                // if (tT % TimeUtil.MILLISECONDS_PER____DAY / 2 === 0 && i === 6) {
                //     console.log('vacS', TimeUtil.formatCategoryDate(tT), grpVacD, grpMaxD, grpDifD, grpFacD, ' -> ', nrmReqD);
                // }

            } else {

                vaccinationGroupDataset.push({
                    nrmReqS: 0,
                    nrmReqD: 0,
                    nrmReqU: 0
                });

            }

        }

        // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0) {
        //     console.log('vaccinationGroupDataset', TimeUtil.formatCategoryDate(tT), vaccinationGroupDataset);
        // }

        let nrmReqT = 0;
        vaccinationGroupDataset.forEach(vaccinationGroupData => {
            nrmReqT += vaccinationGroupData.nrmReqS;
            nrmReqT += vaccinationGroupData.nrmReqD;
            nrmReqT += vaccinationGroupData.nrmReqU;
        });

        if (nrmReqT > 0) {

            // available doses that day
            let nrmJabTotal = modificationTime.getDosesPerDay() * dT / TimeUtil.MILLISECONDS_PER____DAY / this.getAbsTotal();

            // less requested than available
            let requestMultiplier = 1;
            if (nrmReqT < nrmJabTotal) {
                nrmJabTotal = nrmReqT;
            } else {
                requestMultiplier = nrmReqT / nrmJabTotal;
            }

            if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0) {
                console.log('mult', TimeUtil.formatCategoryDate(tT), requestMultiplier, nrmJabTotal * this.getAbsTotal() * 24);
            }


            for (let i = 0; i < this.vaccinationModels.length; i++) {

                const vaccinationGroupData = vaccinationGroupDataset[i];

                let nrmJabS = vaccinationGroupData.nrmReqS * 0.5 / requestMultiplier;
                let nrmJabD = vaccinationGroupData.nrmReqD / requestMultiplier;
                let nrmJabU = vaccinationGroupData.nrmReqU * 0.5 / requestMultiplier;

                // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0 && i === 9) {
                //     console.log('giving', i, TimeUtil.formatCategoryDate(tT), (nrmJabS + nrmJabD + nrmJabU) * this.getAbsTotal() * 24);
                // }

                // remove from susceptible and add to immunizing compartment
                result.addNrmValue(-nrmJabS, this.compartmentsSusceptible[i]);
                result.addNrmValue(+nrmJabS, this.vaccinationModels[i].getCompartmentImmunizing());

                // remove from discovered and add to vaccinated compartment
                result.addNrmValue(-nrmJabD, this.compartmentsRemovedD[i]);
                result.addNrmValue(+nrmJabD, this.vaccinationModels[i].getCompartmentImmunizedD());

                // // remove from undiscovered and add to vaccinated compartment
                result.addNrmValue(-nrmJabU, this.compartmentsRemovedU[i]);
                result.addNrmValue(+nrmJabU, this.vaccinationModels[i].getCompartmentImmunizedU());

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

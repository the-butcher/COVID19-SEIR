import { AgeGroup } from './../common/demographics/AgeGroup';
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
import { stringify } from '@amcharts/amcharts4/.internal/core/utils/Utils';
import { last } from '@amcharts/amcharts4/.internal/core/utils/Array';

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
        const instantDst = ModelConstants.MODEL_MIN_____INSTANT;
        const instantPre = instantDst - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;
        const referenceDataRemoved = baseData.findBaseData(TimeUtil.formatCategoryDate(instantPre));

        /**
         * get all strain values as currently in modifications instance
         */
        const modificationsStrain = Modifications.getInstance().findModificationsByType('STRAIN').map(m => m as ModificationStrain);
        const modificationTime = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'straintime',
            instant: instantPre,
            key: 'TIME',
            name: 'straintime',
            deletable: true,
            draggable: true
        }) as ModificationTime;
        modificationTime.setInstants(instantPre, instantPre);

        const modificationContact = Modifications.getInstance().findModificationsByType('CONTACT')[0] as ModificationContact;
        const modificationValueContact = modificationContact.getModificationValues();
        const modificationTesting = Modifications.getInstance().findModificationsByType('TESTING')[0] as ModificationTesting;
        const modificationValueTesting = modificationTesting.getModificationValues();

        modificationValueContact.instant = instantPre;
        modificationValueTesting.instant = instantPre;

        // fill with zeroes for each age group
        const heatmapPreIncidencesB = ageGroups.map(() => 0);
        const heatmapPreIncidencesC = ageGroups.map(() => 0);

        /**
         * once filled this value remains constant, it reflects the target incidence for each age group, but not respective shares of distinct strains, since not known at this point
         */
        const heatmapDstIncidencesB = ageGroups.map(() => 0);

        let heatmapPreIncidenceTotal = 0;
        let heatmapDstIncidenceTotal = 0;

        const minOffsetIndex = -2;
        const maxOffsetIndex = 3;

        /**
         * calculate target total incidence from existing data
         * incidence is calculated from one intervals one week before model start date
         * reproduction is calculated from two intervals one week before and one week after model start date
         */
        const offsetIndexCount = maxOffsetIndex - minOffsetIndex;
        const casesToIncidence = (cases: number, population: number) => cases / offsetIndexCount * 100000 / population;
        for (let offsetIndex = minOffsetIndex; offsetIndex < maxOffsetIndex; offsetIndex++) {

            const instantPreA = instantPre + (offsetIndex - 7) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantPreB = instantPre + (offsetIndex) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantPreC = instantPre + (offsetIndex + 7) * TimeUtil.MILLISECONDS_PER____DAY;

            const instantDstA = instantDst + (offsetIndex - 7) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantDstB = instantDst + offsetIndex * TimeUtil.MILLISECONDS_PER____DAY;

            ageGroups.forEach(ageGroup => {

                // cases at preload
                const casesPreA = baseData.findBaseData(TimeUtil.formatCategoryDate(instantPreA))[ageGroup.getName()];
                const casesPreB = baseData.findBaseData(TimeUtil.formatCategoryDate(instantPreB))[ageGroup.getName()];
                const casesPreC = baseData.findBaseData(TimeUtil.formatCategoryDate(instantPreC))[ageGroup.getName()];

                // cases at model-min
                const casesDstA = baseData.findBaseData(TimeUtil.formatCategoryDate(instantDstA))[ageGroup.getName()];
                const casesDstB = baseData.findBaseData(TimeUtil.formatCategoryDate(instantDstB))[ageGroup.getName()];

                // case diff at preload
                const heatmapCasesDeltaPreAB = casesPreB - casesPreA;
                const heatmapCasesDeltaPreBC = casesPreC - casesPreB;

                // case diff a model-min
                const heatmapCasesDeltaDstAB = casesDstB - casesDstA;

                // incidences at preload
                heatmapPreIncidencesB[ageGroup.getIndex()] += casesToIncidence(heatmapCasesDeltaPreAB, ageGroup.getAbsValue());
                heatmapPreIncidencesC[ageGroup.getIndex()] += casesToIncidence(heatmapCasesDeltaPreBC, ageGroup.getAbsValue());

                // incidence at model-min
                heatmapDstIncidencesB[ageGroup.getIndex()] += casesToIncidence(heatmapCasesDeltaDstAB, ageGroup.getAbsValue());

            });

            // total incidence at preload
            const casesPreA = baseData.findBaseData(TimeUtil.formatCategoryDate(instantPreA))[ModelConstants.AGEGROUP_NAME_ALL];
            const casesPreB = baseData.findBaseData(TimeUtil.formatCategoryDate(instantPreB))[ModelConstants.AGEGROUP_NAME_ALL];
            const heatmapCasesDeltaPreAB = casesPreB - casesPreA;

            // total case diff at model-min
            const casesDstA = baseData.findBaseData(TimeUtil.formatCategoryDate(instantDstA))[ModelConstants.AGEGROUP_NAME_ALL];
            const casesDstB = baseData.findBaseData(TimeUtil.formatCategoryDate(instantDstB))[ModelConstants.AGEGROUP_NAME_ALL];
            const heatmapCasesDeltaDstAB = casesDstB - casesDstA;

            heatmapPreIncidenceTotal += casesToIncidence(heatmapCasesDeltaPreAB, demographics.getAbsTotal());
            heatmapDstIncidenceTotal += casesToIncidence(heatmapCasesDeltaDstAB, demographics.getAbsTotal());

        }
        console.log(`pre incidence (ages age-groups, strains: ALL, date: ${TimeUtil.formatCategoryDate(instantPre)})`, heatmapPreIncidencesB, heatmapPreIncidenceTotal);
        console.log(`dst incidence (ages age-groups, strains: ALL, date: ${TimeUtil.formatCategoryDate(instantDst)})`, heatmapDstIncidencesB, heatmapDstIncidenceTotal);

        let primaryStrainPreIncidence = heatmapPreIncidenceTotal;
        let primaryStrainDstIncidence = heatmapDstIncidenceTotal;

        // strains other than primary
        for (let strainIndexA = 1; strainIndexA < modificationsStrain.length; strainIndexA++) {

            const strainPreIncidence = modificationsStrain[strainIndexA].getModificationValues().dstIncidence / heatmapDstIncidenceTotal * heatmapPreIncidenceTotal;
            const strainDstIncidence = modificationsStrain[strainIndexA].getModificationValues().dstIncidence;

            primaryStrainPreIncidence -= strainPreIncidence;
            primaryStrainDstIncidence -= strainDstIncidence;

            // update primary strain to hold remaining incidence
            modificationsStrain[strainIndexA].acceptUpdate({
                preIncidence: strainPreIncidence,
                dstIncidence: strainDstIncidence
            });
            console.log(`pre incidence (strain: ${modificationsStrain[strainIndexA].getName()}, date: ${TimeUtil.formatCategoryDate(instantPre)})`, modificationsStrain[strainIndexA].getIncidence());
            console.log(`dst incidence (strain: ${modificationsStrain[strainIndexA].getName()}, date: ${TimeUtil.formatCategoryDate(instantDst)})`, modificationsStrain[strainIndexA].getIncidence());

        }

        // update primary strain to hold remaining incidence
        modificationsStrain[0].acceptUpdate({
            preIncidence: primaryStrainPreIncidence,
            dstIncidence: primaryStrainDstIncidence,
        });
        console.log(`pre incidence (strain: ${modificationsStrain[0].getName()}, date: ${TimeUtil.formatCategoryDate(instantPre)})`, modificationsStrain[0].getIncidence());
        console.log(`dst incidence (strain: ${modificationsStrain[0].getName()}, date: ${TimeUtil.formatCategoryDate(instantDst)})`, modificationsStrain[0].getIncidence());

        for (let strainIndexA = 0; strainIndexA < modificationsStrain.length; strainIndexA++) {

            const strainSharePreA = modificationsStrain[strainIndexA].getModificationValues().preIncidence / heatmapPreIncidenceTotal;

            // initial strain incidences as of incidence config
            const strainPreIncidences = heatmapPreIncidencesB.map(i => i * strainSharePreA);

            modificationsStrain[strainIndexA].acceptUpdate({
                preIncidences: strainPreIncidences,
            });

        }

        /**
         * approximate in multiple steps
         */
        let model: ModelImplRoot;
        let modelStateIntegrator: ModelStateIntegrator;

        for (let approximationIndex = 0; approximationIndex < ModelConstants.APPROXIMATION_________CYCLES; approximationIndex++) {

            const instantB = instantPre
            const instantC = instantPre + 7 * TimeUtil.MILLISECONDS_PER____DAY;
            for (let strainIndexA = 0; strainIndexA < modificationsStrain.length; strainIndexA++) {

                /**
                 * r0 = r0A * shareA + r0B * shareB + r0C * shareC
                 * r0 = r0A * shareA + (r0A / ratioOfReproductionAB) * shareB + (r0A / ratioOfReproductionAC) * shareC
                 * r0 = r0A * shareA + r0A * shareB / ratioOfReproductionAB + r0A * shareC / ratioOfReproductionAC
                 * r0 = r0A * (shareA + shareB / ratioOfReproductionAB + shareC / ratioOfReproductionAC
                 */
                let reproductionRatio = 0;
                for (let strainIndexB = 0; strainIndexB < modificationsStrain.length; strainIndexB++) {

                    const ratioAB = modificationsStrain[strainIndexA].getR0() / modificationsStrain[strainIndexB].getR0();
                    const strainShareB = modificationsStrain[strainIndexB].getModificationValues().preIncidence / heatmapPreIncidenceTotal;
                    reproductionRatio += strainShareB / ratioAB;
                    // console.log('ratio', modificationsStrain[strainIndexB].getName(), modificationsStrain[strainIndexA].getName(), ratioAB);

                }

                const strainReproductions: number[] = [];
                ageGroups.forEach(ageGroup => {
                    const strainReproduction = StrainUtil.calculateR0(heatmapPreIncidencesB[ageGroup.getIndex()], heatmapPreIncidencesC[ageGroup.getIndex()], instantB, instantC,  modificationsStrain[strainIndexA].getSerialInterval() *  modificationsStrain[strainIndexA].getIntervalScale());
                    strainReproductions.push(strainReproduction / reproductionRatio);
                });

                modificationsStrain[strainIndexA].acceptUpdate({
                    preGrowthRate: strainReproductions
                });

            }

            // build a model with current data
            model = new ModelImplRoot(demographics, modifications, referenceDataRemoved, baseData);
            modelStateIntegrator = new ModelStateIntegrator(model, instantPre);
            modelStateIntegrator.prefillVaccination();

            let modelData: IDataItem[];
            let dstInstant = -1;

            // modifications are sorted instant-wise
            // does strain calculation of preIncidences require consideration in other strains?
            // maybe yes, since the primary strains needs to adjust with other strain giving or requiring incidence
            const lastDataItems: IDataItem[] = [];
            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                // console.log('strain mod at init of approx cycle', approximationIndex, modificationsStrain[strainIndex]);

                // iterate if there is time between strains
                if (modificationsStrain[strainIndex].getInstantA() > dstInstant) {
                    dstInstant = modificationsStrain[strainIndex].getInstantA();
                    modelData = await modelStateIntegrator.buildModelData(dstInstant, curInstant => curInstant === dstInstant, modelProgress => {
                        progressCallback({
                            ratio: modelProgress.ratio
                        });
                    });

                    //get a data-item that contains the information at strain config instant
                    lastDataItems[strainIndex] = modelData[modelData.length - 1];

                }

            }

            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                const lastDataItem = lastDataItems[strainIndex];

                // look at each age group separately
                const preIncidences: number[] = [...modificationsStrain[strainIndex].getModificationValues().preIncidences];

                // any strain other than primary should be able to "float" through age groups, so actually it should not constrain to strain specific values
                if (strainIndex > 0) {

                    // what it came to be in the model
                    const totalIncidenceSource = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_ALL].INCIDENCES[modificationsStrain[strainIndex].getId()];

                    // what it should be at strain config time
                    const totalIncidenceTarget = modificationsStrain[strainIndex].getModificationValues().dstIncidence;

                    // a correction applicable to current incidence settings
                    const totalIncidenceFactor = totalIncidenceTarget / totalIncidenceSource;

                    ageGroups.forEach(ageGroup => {
                        preIncidences[ageGroup.getIndex()] *= totalIncidenceFactor;
                    });

                    modificationsStrain[strainIndex].acceptUpdate({
                        preIncidences,
                    });

                } else {

                    // primary strain!!
                    const otherIncidencesAtPrimaryStrainTime: number[] = ageGroups.map(() => 0); // by age group
                    for (let strainIndexB = 1; strainIndexB < modificationsStrain.length; strainIndexB++) {

                        // collect other strain's incidences for that time
                        ageGroups.forEach(ageGroup => {
                            otherIncidencesAtPrimaryStrainTime[ageGroup.getIndex()] += lastDataItem.valueset[ageGroup.getName()].INCIDENCES[modificationsStrain[strainIndexB].getId()];
                        });

                    }

                    ageGroups.forEach(ageGroup => {

                        // what it came to be in the model
                        const ageGroupIncidenceSource = lastDataItem.valueset[ageGroup.getName()].INCIDENCES[modificationsStrain[strainIndex].getId()];

                        // what it should be at strain config time
                        const ageGroupIncidenceTarget = heatmapDstIncidencesB[ageGroup.getIndex()] - otherIncidencesAtPrimaryStrainTime[ageGroup.getIndex()];

                        // a correction applicable to current incidence settings
                        const ageGroupIncidenceFactor = ageGroupIncidenceTarget / ageGroupIncidenceSource;

                        preIncidences[ageGroup.getIndex()] *= ageGroupIncidenceFactor;

                    });

                    modificationsStrain[strainIndex].acceptUpdate({
                        preIncidences,
                    });

                }

            }

        }

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
        modelStateIntegrator = new ModelStateIntegrator(model, instantPre);
        modelStateIntegrator.prefillVaccination();
        await modelStateIntegrator.buildModelData(ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY, () => false, () => {});
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

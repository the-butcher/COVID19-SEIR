import { ObjectUtil } from './../util/ObjectUtil';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTesting } from '../common/modification/ModificationTesting';
import { ModificationTime } from '../common/modification/ModificationTime';
import { StrainUtil } from '../util/StrainUtil';
import { TimeUtil } from './../util/TimeUtil';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { CompartmentInfectious } from './compartment/CompartmentInfectious';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { BaseData } from './incidence/BaseData';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelImplStrain } from './ModelImplStrain';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

/**
 * submodel for a single strain and single age groups (i.e. all infections with b.1.1.7 in the age-group of 25-34)
 *
 * @author h.fleischer
 * @since 31.05.2021
 */
export class ModelImplInfectious implements IModelSeir {

    private readonly parentModel: ModelImplStrain;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;

    private readonly compartmentsInfectious: CompartmentInfectious[];
    private readonly compartmentsIncidence: CompartmentBase[];

    private integrationSteps: IModelIntegrationStep[];


    constructor(parentModel: ModelImplStrain, demographics: Demographics, ageGroup: AgeGroup, strainValues: IModificationValuesStrain, modificationTesting: ModificationTesting, baseData: BaseData) {

        this.parentModel = parentModel;
        this.compartmentsInfectious = [];
        this.compartmentsIncidence = [];
        this.integrationSteps = [];

        this.absTotal = demographics.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();

        // make some assumptions about initial cases (duplicated code in ModelImplIncidence)
        let dailyTested = strainValues.incidence * ageGroup.getAbsValue() / 700000;

        /**
         * strain modifiers hold target incidences per strain (taken from heatmap data)
         */
        if (strainValues.incidences) {
            dailyTested = strainValues.incidences[this.ageGroupIndex] * ageGroup.getAbsValue() / 700000;
        }
        const dailyActual = dailyTested / modificationTesting.getTestingRatio(ageGroup.getIndex());

        const daysLatent = StrainUtil.calculateLatency(strainValues.serialInterval, strainValues.intervalScale);
        const daysInfectious = StrainUtil.calculateInfecty(strainValues.serialInterval, strainValues.intervalScale);

        const absExposed = dailyActual * daysLatent; // an estimate for exposure for the age group and strain
        const absInfectious = dailyActual * daysInfectious;
        const compartmentParams = CompartmentChain.getInstance().getStrainedCompartmentParams(strainValues);

        /**
         * strain contains approximations about reproduction rate
         */
        if (strainValues.reproduction) {

            // incubation offset is the "reference" offset, where the initial "incidence" associated with this model applies
            const incubationOffset = (compartmentParams[CompartmentChain.COMPARTMENT_COUNT_PRE__INCUBATION].instantA + compartmentParams[CompartmentChain.COMPARTMENT_COUNT_PRE__INCUBATION].instantB) / 2;
            console.log('incubationOffset', incubationOffset / TimeUtil.MILLISECONDS_PER____DAY);
            for (let compartmentIndex = 0; compartmentIndex < compartmentParams.length; compartmentIndex++) {

                const compartmentParam = compartmentParams[compartmentIndex];

            }

        }

        /**
         * build compartments
         */
        // let incubationOffset: number;
        // let dailyCasesAtIncubation: number;
        // let r0: number;

        // for (let compartmentIndex = 1; compartmentIndex < compartmentParams.length; compartmentIndex++) {
        //     if (!compartmentParams[compartmentIndex].presymptomatic) {

        //         const compartmentParam = compartmentParams[compartmentIndex];
        //         const duration = compartmentParam.instantB - compartmentParam.instantA;

        //         incubationOffset = compartmentParams[compartmentIndex].instantA; // days after exposure (can act as offset when looking into BaseData incidence)
        //         dailyCasesAtIncubation = dailyCases;

        //         console.log('incubationOffset', incubationOffset);




        //         const rangeDays = 7; // must be a fixed number
        //         const instantA = ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY * 7;
        //         const instantB = ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY * 0;
        //         const instantC = ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY * -7;

        //         const dataItemA = baseData.findBaseData(TimeUtil.formatCategoryDate(instantA));
        //         const dataItemB = baseData.findBaseData(TimeUtil.formatCategoryDate(instantB));
        //         const dataItemC = baseData.findBaseData(TimeUtil.formatCategoryDate(instantC));
        //         const casesA = dataItemA[ageGroup.getName()];
        //         const casesB = dataItemB[ageGroup.getName()];
        //         const casesC = dataItemC[ageGroup.getName()];

        //         const dailyCasesB = (casesB - casesA) / (rangeDays * modificationTesting.getTestingRatio(ageGroup.getIndex()));
        //         const dailyCasesC = (casesC - casesB) / (rangeDays * modificationTesting.getTestingRatio(ageGroup.getIndex()));
        //         r0 = StrainUtil.calculateR0(dailyCasesB, dailyCasesC, instantB, instantC, strainValues.serialInterval);
        //         console.log('r0', r0);

        //         /**
        //          * this actually resembles the number between compartments
        //          */
        //         dailyCasesAtIncubation = dailyCases;

        //         // console.log(dailyCasesAtIncubation, dailyCasesB, dailyCasesC)

        //         break;

        //     }
        // }


        let checkPreSymptomatic = true;
        for (let compartmentIndex = 0; compartmentIndex < compartmentParams.length; compartmentIndex++) {

            const compartmentParam = compartmentParams[compartmentIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            // const instantR = 0;
            // const instantA = incubationOffset - compartmentParam.instantA;
            // const instantB = incubationOffset - compartmentParam.instantB;

            // const valueA = StrainUtil.calculateValueB(dailyCasesAtIncubation, r0, instantR, instantA, strainValues.serialInterval * strainValues.intervalScale);
            // const valueB = StrainUtil.calculateValueB(dailyCasesAtIncubation, r0, instantR, instantB, strainValues.serialInterval * strainValues.intervalScale);
            // const valueD = (valueB + valueA) / 2 * duration / TimeUtil.MILLISECONDS_PER____DAY;
            // // console.log('valueD', valueA, valueB);


            if (compartmentParam.type === ECompartmentType.E_____EXPOSED) {
                // absExposed
                this.compartmentsInfectious.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absExposed, this.ageGroupIndex, strainValues.id, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));
            } else {

                let absInfectiousCompartment =  absInfectious * compartmentParam.i0Normal;
                // if (checkPreSymptomatic && !compartmentParams[compartmentIndex].presymptomatic)  {
                //     let absInfectiousCompartment =  absInfectious * compartmentParam.i0Normal;
                //     console.log(absInfectiousCompartment, dailyCasesAtIncubation);
                //     checkPreSymptomatic = false;
                // }
                // console.log('valueD', valueD, absInfectiousCompartment);

                // absInfectiousCompartment
                this.compartmentsInfectious.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absInfectiousCompartment, this.ageGroupIndex, strainValues.id, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));

            }

        };

        this.nrmValue = (absExposed + absInfectious) / this.absTotal;

        /**
         * compartment for calculating incidence
         */
        // primary compartment (cases at the point of incubation)
        this.compartmentsIncidence.push(new CompartmentBase(ECompartmentType.X__INCUBATE_0, this.absTotal, dailyTested, this.ageGroupIndex, strainValues.id, TimeUtil.MILLISECONDS_PER____DAY));

        // secondary compartments (cases propagate backwards 7 days, so an incidence can be calculated from the total sum of this model)
        for (let i = 1; i < 7; i++) {
            this.compartmentsIncidence.push(new CompartmentBase(ECompartmentType.X__INCUBATE_N, this.absTotal, dailyTested, this.ageGroupIndex, strainValues.id, TimeUtil.MILLISECONDS_PER____DAY));
        }

        /**
         * connect infection compartments among each other
         */
        for (let compartmentIndex = 0; compartmentIndex < this.compartmentsInfectious.length; compartmentIndex++) {

            const sourceCompartment = this.compartmentsInfectious[compartmentIndex];
            const targetCompartment = this.compartmentsInfectious[compartmentIndex + 1]; // may resolve to null, in which case values will simply be non-continued in this model
            this.integrationSteps.push({

                apply: (modelState: IModelState, dT: number, tT: number, modificationTime: ModificationTime) => {

                    const increments = ModelState.empty();

                    const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(sourceCompartment);

                    // if (tT % TimeUtil.MILLISECONDS_PER____DAY && TimeUtil.formatCategoryDate(tT) === '01.05.') {
                    //     console.log('continuationRate', continuationRate, continuationValue);
                    // }

                    /**
                     * move from infectious compartment to next infectious compartment, if any
                     * moving to recovered currently happens in ModelImplRoot (?)
                     */
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (targetCompartment) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }

                    /**
                     * at incubation time (which might be the time that infections are registered) copy the relevant number into the incidence model
                     * only consider cases that have been discovered
                     */
                    if (sourceCompartment.isPreSymptomatic() && !targetCompartment.isPreSymptomatic()) {
                        const compartmentCases = this.compartmentsIncidence[0]; // this.parentModel.getIncidenceModel(this.ageGroupIndex).getIncomingCompartment();
                        const discoveredNrmCases = continuationValue * modificationTime.getTestingRatio(this.ageGroupIndex);
                        increments.addNrmValue(discoveredNrmCases, compartmentCases);
                    }
                    return increments;

                }

            });

        }

        /**
         * connect incidence compartments among each other, last compartment juts looses its population to nowhere without further propagation
         */
        for (let compartmentIndex = 0; compartmentIndex < this.compartmentsIncidence.length; compartmentIndex++) {

            const sourceCompartment = this.compartmentsIncidence[compartmentIndex];
            const targetCompartment = this.compartmentsIncidence[compartmentIndex + 1]; // will evaluate to null and be caught further down
            this.integrationSteps.push({

                apply: (modelState: IModelState, dT: number, tT: number) => {

                    const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(sourceCompartment);
                    const increments = ModelState.empty();
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (targetCompartment) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }
                    return increments;

                }

            });

        }


        // const modelState = this.getInitialState();
        // const minInstant = ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY * 28;
        // const maxInstant = ModelConstants.MODEL_MIN_____INSTANT - TimeUtil.MILLISECONDS_PER____DAY * 10;
        // for (let curInstant = minInstant; curInstant <= maxInstant; curInstant += ModelStateIntegrator.DT) {

        //     const modificationTime = new ModificationTime({
        //         id: ObjectUtil.createId(),
        //         key: 'TIME',
        //         instant: curInstant,
        //         name: 'step',
        //         deletable: false,
        //         draggable: false
        //     });
        //     modificationTime.setInstants(curInstant, curInstant); // tT, tT is by purpose, standing for instant, instant

        //     modelState.add(this.apply(modelState, ModelStateIntegrator.DT, curInstant, modificationTime));

        //     const instantA = curInstant;
        //     const instantB = curInstant + TimeUtil.MILLISECONDS_PER____DAY;
        //     const baseDataA = baseData.findBaseData(TimeUtil.formatCategoryDate(instantA));
        //     const baseDataB = baseData.findBaseData(TimeUtil.formatCategoryDate(instantB));
        //     const casesA = baseDataA[ageGroup.getName()];
        //     const casesB = baseDataB[ageGroup.getName()];
        //     // console.log((casesB - casesA) / 24);
        //     modelState.addNrmValue((casesB - casesA) / 24 / this.absTotal / modificationTesting.getTestingRatio(this.ageGroupIndex), this.getIncomingCompartment());

        //     // modelState.add(modelStateChanges);

        // }
        // console.log('--------------------------', ageGroup.getName());
        // this.compartments.forEach(compartment => {
        //     compartment.setNrmValue(modelState.getNrmValue(compartment));
        //     console.log(modelState.getNrmValue(compartment) * this.absTotal);
        // });



    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getFirstCompartment(): CompartmentInfectious {
        return this.compartmentsInfectious[0];
    }

    getLastCompartment(): CompartmentInfectious {
        return this.compartmentsInfectious[this.compartmentsInfectious.length - 1];
    }

    getCompartments(): CompartmentInfectious[] {
        return this.compartmentsInfectious;
    }

    /**
     * get a normalized value of how many exposures this model will produce
     *
     * @param modelState
     * @param testingMultiplier
     * @returns
     */
    getAbsInfectious(modelState: IModelState, dT: number): number {
        return this.getNrmInfectious(modelState, dT) * this.absTotal;
    }

    getNrmInfectious(modelState: IModelState, dT: number): number {
        let nrmInfectious = 0;
        this.compartmentsInfectious.forEach(compartmentInfectious => {
            nrmInfectious += modelState.getNrmValue(compartmentInfectious) * compartmentInfectious.getReproductionRatio().getRate(dT);
        });
        return nrmInfectious;
    }

    // getNrmI(modelState: IModelState, dT: number, tT: number): number {
    //     let nrmInfectious = 0;
    //     this.compartments.forEach(compartmentInfectious => {
    //         nrmInfectious += modelState.getNrmValue(compartmentInfectious) * compartmentInfectious.getContinuationRatio().getRate(dT, tT);
    //     });
    //     return nrmInfectious;
    // }

    getNrmValueGroup(ageGroupIndex: number): number {
        return ageGroupIndex === this.ageGroupIndex ? this.nrmValue : 0;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }
    getNrmValue(): number {
        return this.nrmValue;
    }
    getAbsValue(): number {
        return this.nrmValue * this.absTotal;
    }

    getAgeGroupIndex(): number {
        return this.ageGroupIndex;
    }
    getAgeGroupTotal(): number {
        return this.ageGroupTotal;
    }

    getInitialState(): IModelState {
        const initialState = ModelState.empty();
        this.compartmentsInfectious.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        this.compartmentsIncidence.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        return initialState;
    }

    isValid(): boolean {
        throw new Error('NI');
    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {

        // if (tT % TimeUtil.MILLISECONDS_PER____DAY && TimeUtil.formatCategoryDate(tT) === '01.05.') {
        //     console.log('--------------------------', this.ageGroupIndex);
        //     this.compartments.forEach(compartment => {
        //         compartment.setNrmValue(state.getNrmValue(compartment));
        //         console.log(state.getNrmValue(compartment) * this.absTotal);
        //     });
        // }

        const result = ModelState.empty();
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT, modificationTime));
        });
        return result;

    }

}
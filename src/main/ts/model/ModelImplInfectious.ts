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
            console.log('>>', ageGroup.getName(), strainValues.incidences[this.ageGroupIndex]);
        }

        let incidenceRatio = 1;
        if (strainValues.reproduction) {
            let incidenceSum = 0;
            for (let i = 0; i < 7; i++) {
                const instantC = TimeUtil.MILLISECONDS_PER____DAY * - (i + 0.5);
                incidenceSum += StrainUtil.calculateValueB(strainValues.incidences[this.ageGroupIndex], strainValues.reproduction[this.ageGroupIndex], 0, instantC, strainValues.serialInterval * strainValues.intervalScale);
            }
            incidenceSum /= 7;
            incidenceRatio = strainValues.incidences[this.ageGroupIndex] / incidenceSum;
            console.log('incidence ratio', incidenceRatio);
        }


        const compartmentParams = CompartmentChain.getInstance().getStrainedCompartmentParams(strainValues);

        let absCompartmentInfectiousSum = 0;
        const incubationOffset = (compartmentParams[CompartmentChain.COMPARTMENT_COUNT_PRE__INCUBATION].instantA + compartmentParams[CompartmentChain.COMPARTMENT_COUNT_PRE__INCUBATION].instantB) / 2;

        for (let compartmentIndex = 0; compartmentIndex < compartmentParams.length; compartmentIndex++) {

            const compartmentParam = compartmentParams[compartmentIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            const instantC = incubationOffset - (compartmentParam.instantA + compartmentParam.instantB) / 2;
            if (strainValues.reproduction) {
                const incidenceC = incidenceRatio * StrainUtil.calculateValueB(strainValues.incidences[this.ageGroupIndex], strainValues.reproduction[this.ageGroupIndex], 0, instantC, strainValues.serialInterval * strainValues.intervalScale);
                // console.log('  ', ageGroup.getName(), incidenceC);
                dailyTested = incidenceC * ageGroup.getAbsValue() / 700000;
            }
            const dailyActual = dailyTested / modificationTesting.getTestingRatio(ageGroup.getIndex());
            const absCompartment = dailyActual * duration / TimeUtil.MILLISECONDS_PER____DAY;
            this.compartmentsInfectious.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absCompartment, this.ageGroupIndex, strainValues.id, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));

            absCompartmentInfectiousSum += absCompartment;

        };

        this.nrmValue = absCompartmentInfectiousSum / this.absTotal;

        /**
         * compartment for calculating incidence
         */
        // primary incidence compartment (cases at the point of incubation)
        // this.compartmentsIncidence.push(new CompartmentBase(ECompartmentType.X__INCUBATE_0, this.absTotal, dailyTested, this.ageGroupIndex, strainValues.id, TimeUtil.MILLISECONDS_PER____DAY));

        // secondary incidence compartments (cases propagate backwards 7 days, so an incidence can be calculated from the total sum of this model)
        for (let i = 0; i < 7; i++) {

            const instantC = TimeUtil.MILLISECONDS_PER____DAY * - (i + 0.5);
            if (strainValues.reproduction) {
                const incidenceC = incidenceRatio * StrainUtil.calculateValueB(strainValues.incidences[this.ageGroupIndex], strainValues.reproduction[this.ageGroupIndex], 0, instantC, strainValues.serialInterval * strainValues.intervalScale);
                dailyTested = incidenceC * ageGroup.getAbsValue() / 700000; // // incidenceC
                // console.log('  ', i, ageGroup.getName(), incidenceC, dailyTested);
                // console.log('dailyTested', ageGroup.getName(), i, incidenceC, dailyTested);
            }

            const compartmentType = i == 0 ? ECompartmentType.X__INCUBATE_0 : ECompartmentType.X__INCUBATE_N;
            this.compartmentsIncidence.push(new CompartmentBase(compartmentType, this.absTotal, dailyTested, this.ageGroupIndex, strainValues.id, TimeUtil.MILLISECONDS_PER____DAY));

        }
        // console.log('incidenceSum', incidenceSum / 7);

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
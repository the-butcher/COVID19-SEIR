import { ObjectUtil } from './../util/ObjectUtil';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { StrainUtil } from '../util/StrainUtil';
import { TimeUtil } from './../util/TimeUtil';
import { BaseData } from './basedata/BaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { CompartmentInfectious } from './compartment/CompartmentInfectious';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelImplStrain } from './ModelImplStrain';
import { RationalDurationFixed } from './rational/RationalDurationFixed';
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

    private readonly compartmentsInfectiousPrimary: CompartmentInfectious[];
    private readonly compartmentsIncidence: CompartmentBase[];

    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplStrain, demographics: Demographics, ageGroup: AgeGroup, strainValues: IModificationValuesStrain, modificationTime: ModificationTime) {

        this.parentModel = parentModel;
        this.compartmentsInfectiousPrimary = [];
        this.compartmentsIncidence = [];
        this.integrationSteps = [];

        this.absTotal = demographics.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();


        // make some assumptions about initial cases (duplicated code in ModelImplIncidence)
        let dailyTested = strainValues.preIncidence * ageGroup.getAbsValue() / 700000;

        /**
         * strain modifiers hold target incidences per strain (taken from heatmap data)
         */
        if (strainValues.preIncidences) {
            dailyTested = strainValues.preIncidences[this.ageGroupIndex] * ageGroup.getAbsValue() / 700000;
        }

        let incidenceRatio = 1;
        if (strainValues.preGrowthRate) {

            /**
             * there must be a much cleaner solution for this, TODO get to terms with the math
             */
            let incidenceSum = 0;
            for (let i = 0; i < 7; i++) {
                const instantB = TimeUtil.MILLISECONDS_PER____DAY * - (i + 1.5);
                incidenceSum += StrainUtil.calculateValueB(strainValues.preIncidences[this.ageGroupIndex], strainValues.preGrowthRate[this.ageGroupIndex], 0, instantB, strainValues.serialInterval * strainValues.intervalScale);
            }
            incidenceSum /= 7;
            incidenceRatio = strainValues.preIncidences[this.ageGroupIndex] / incidenceSum;
            // console.log('r0: ', strainValues.reproduction[this.ageGroupIndex], 'rR: ', incidenceRatio, incidenceRatio / strainValues.reproduction[this.ageGroupIndex]);

        }


        const compartmentParams = CompartmentChain.getInstance().getStrainedCompartmentParams(strainValues);

        let absCompartmentInfectiousSum = 0;
        const incubationOffset = (compartmentParams[CompartmentChain.COMPARTMENT_COUNT_PRE__INCUBATION].instantA + compartmentParams[CompartmentChain.COMPARTMENT_COUNT_PRE__INCUBATION].instantB) / 2;

        for (let chainIndex = 0; chainIndex < compartmentParams.length; chainIndex++) {

            const compartmentParam = compartmentParams[chainIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            const instantC = incubationOffset - (compartmentParam.instantA + compartmentParam.instantB) / 2;
            if (strainValues.preGrowthRate) {

                const incidenceC = incidenceRatio * StrainUtil.calculateValueB(strainValues.preIncidences[this.ageGroupIndex], strainValues.preGrowthRate[this.ageGroupIndex], 0, instantC, strainValues.serialInterval * strainValues.intervalScale);
                dailyTested = incidenceC * ageGroup.getAbsValue() / 700000;

            }
            const dailyActual = dailyTested / modificationTime.getDiscoveryRatios(ageGroup.getIndex()).discovery;
            const absCompartment = dailyActual * duration / TimeUtil.MILLISECONDS_PER____DAY;
            this.compartmentsInfectiousPrimary.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absCompartment, this.ageGroupIndex, strainValues.id, compartmentParam.r0, duration, compartmentParam.presymptomatic, `_INF_${ObjectUtil.padZero(chainIndex)}`));

            absCompartmentInfectiousSum += absCompartment;

        };

        this.nrmValue = absCompartmentInfectiousSum / this.absTotal;
        for (let incidenceIndex = 0; incidenceIndex < 7; incidenceIndex++) {
            const instantB = TimeUtil.MILLISECONDS_PER____DAY * - (incidenceIndex + 1.5);
            if (strainValues.preGrowthRate) {
                const incidenceC = incidenceRatio * StrainUtil.calculateValueB(strainValues.preIncidences[this.ageGroupIndex], strainValues.preGrowthRate[this.ageGroupIndex], 0, instantB, strainValues.serialInterval * strainValues.intervalScale);
                dailyTested = incidenceC * ageGroup.getAbsValue() / 700000;
            }
            const compartmentType = incidenceIndex == 0 ? ECompartmentType.X__INCUBATE_0 : ECompartmentType.X__INCUBATE_N;
            this.compartmentsIncidence.push(new CompartmentBase(compartmentType, this.absTotal, dailyTested, this.ageGroupIndex, strainValues.id, new RationalDurationFixed(TimeUtil.MILLISECONDS_PER____DAY), `_7DI_${ObjectUtil.padZero(incidenceIndex)}`));
        }
        // console.log('incidenceSum', incidenceSum / 7);

        /**
         * connect infection compartments among each other
         */
        this.linkCompartmentsInfectious(this.compartmentsInfectiousPrimary);

        /**
         * connect incidence compartments among each other, last compartment juts looses its population to nowhere without further propagation
         */
        for (let compartmentIndex = 0; compartmentIndex < this.compartmentsIncidence.length; compartmentIndex++) {

            const sourceCompartment = this.compartmentsIncidence[compartmentIndex];
            const targetCompartment = this.compartmentsIncidence[compartmentIndex + 1]; // will evaluate to null and be caught further down
            this.integrationSteps.push({

                apply: (modelState: IModelState, dT: number, tT: number) => {

                    // const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = sourceCompartment.getContinuationRatio().getRate(dT, tT) * modelState.getNrmValue(sourceCompartment);
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

    linkCompartmentsInfectious(compartmentsInfectious: CompartmentInfectious[]): void {

        /**
         * connect infection compartments among each other
         */
         for (let compartmentIndex = 0; compartmentIndex < compartmentsInfectious.length; compartmentIndex++) {

            const sourceCompartment = compartmentsInfectious[compartmentIndex];
            const targetCompartment = compartmentsInfectious[compartmentIndex + 1]; // may resolve to null, in which case values will simply be non-continued in this model
            this.integrationSteps.push({

                apply: (modelState: IModelState, dT: number, tT: number, modificationTime: ModificationTime) => {

                    const increments = ModelState.empty();

                    // const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = sourceCompartment.getContinuationRatio().getRate(dT, tT) * modelState.getNrmValue(sourceCompartment);

                    /**
                     * move from infectious compartment to next infectious compartment, if any
                     * moving to recovered currently happens in ModelImplRoot (?)
                     */
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (targetCompartment) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }

                    /**
                     * at incubation time (which is assumed to be the time that infections are registered) copy the relevant number into the incidence model
                     * only consider cases that have been discovered
                     */
                    if (sourceCompartment.isPreSymptomatic() && !targetCompartment.isPreSymptomatic()) {
                        const compartmentDiscoveredCases = this.compartmentsIncidence[0];
                        const discoveredNrmCases = continuationValue * modificationTime.getDiscoveryRatios(this.ageGroupIndex).discovery;
                        increments.addNrmValue(discoveredNrmCases, compartmentDiscoveredCases);
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
        return this.compartmentsInfectiousPrimary[0];
    }

    getLastCompartment(): CompartmentInfectious {
        return this.compartmentsInfectiousPrimary[this.compartmentsInfectiousPrimary.length - 1];
    }

    getCompartments(): CompartmentInfectious[] {
        return this.compartmentsInfectiousPrimary;
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
        this.compartmentsInfectiousPrimary.forEach(compartmentInfectious => {
            nrmInfectious += modelState.getNrmValue(compartmentInfectious) * compartmentInfectious.getReproductionRatio().getRate(dT);
        });
        return nrmInfectious;
    }

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
        this.compartmentsInfectiousPrimary.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        this.compartmentsIncidence.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        return initialState;
    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = ModelState.empty();
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT, modificationTime));
        });
        return result;
    }

}
import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { StrainUtil } from '../util/StrainUtil';
import { CompartmentChain } from './compartment/CompartmentChain';
import { CompartmentInfectious } from './compartment/CompartmentInfectious';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ICompartment } from './compartment/ICompartment';
import { IConnectable } from './compartment/IConnectable';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelImplStrain } from './ModelImplStrain';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

export class ModelImplInfectious implements IModelSeir, IConnectable {

    private readonly parentModel: ModelImplStrain;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;

    private readonly compartments: CompartmentInfectious[];
    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplStrain, demographics: Demographics, ageGroup: AgeGroup, strainValues: IModificationValuesStrain) {

        this.parentModel = parentModel;
        this.compartments = [];
        this.integrationSteps = [];

        this.absTotal = demographics.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();

        // make some assumptions about initial cases (duplicated code in ModelImplIncidence)
        let dailyCases = strainValues.incidence * ageGroup.getAbsValue() / 700000;
        // if (strainValues.compartmentInfectiousPrefill) { // initial scaling should already be considered here
        //     dailyCases = strainValues.ageGroupIncidences[this.ageGroupIndex] * ageGroup.getAbsValue() / 700000;
        // }
        const daysLatent = StrainUtil.calculateLatency(strainValues.serialInterval, strainValues.intervalScale);
        const daysInfectious = StrainUtil.calculateInfecty(strainValues.serialInterval, strainValues.intervalScale);

        const absExposed = dailyCases * daysLatent; // an estimate for exposure for the age group and strain
        const absInfectious = dailyCases * daysInfectious;
        const compartmentParams = CompartmentChain.getInstance().getStrainedCompartmentParams(strainValues);

        // let reproductionSum = 0;
        // let durationSum = 0;
        // let i0NormalSum = 0;
        // let i0AbsoluteSum = 0

        /**
         * build compartments
         */
        // console.log(absExposed, compartmentParams, strainValues.strainPrefills);

        for (let compartmentIndex = 0; compartmentIndex < compartmentParams.length; compartmentIndex++) {

            const compartmentParam = compartmentParams[compartmentIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            // reproductionSum += compartmentParam.reproduction;
            // durationSum += duration;
            // i0NormalSum += compartmentParam.i0Normal;


            if (compartmentParam.type === ECompartmentType.E_____EXPOSED) {
                this.compartments.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absExposed, this.ageGroupIndex, strainValues.id, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));
            } else {

                let absInfectiousCompartment =  absInfectious * compartmentParam.i0Normal;
                this.compartments.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absInfectiousCompartment, this.ageGroupIndex, strainValues.id, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));

            }

        };

        this.nrmValue = (absExposed + absInfectious) / this.absTotal;

        /**
         * connect compartments among each other
         */
        for (let compartmentIndex = 1; compartmentIndex < this.compartments.length; compartmentIndex++) {

            const sourceCompartment = this.compartments[compartmentIndex - 1];
            const targetCompartment = this.compartments[compartmentIndex]; // may resolve to null, in which case values will simply be non-continued in this model
            this.integrationSteps.push({
                apply: (modelState: IModelState, dT: number, tT: number, modificationTime: ModificationTime) => {

                    const increments = ModelState.empty();

                    const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(sourceCompartment);

                    /**
                     * move from infectious compartment to next infectious compartment, if any
                     */
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (targetCompartment) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }

                    /**
                     * at incubation time, copy into infectious model
                     */
                    if (sourceCompartment.isPreSymptomatic() && !targetCompartment.isPreSymptomatic()) {
                        const compartmentCases = this.parentModel.getIncidenceModel(this.ageGroupIndex).getIncomingCompartment();
                        const discoveredNrmCases = continuationValue; // * modificationTime.getTestingRatio(this.ageGroupIndex);
                        increments.addNrmValue(discoveredNrmCases, compartmentCases);
                    }
                    return increments;

                }
            });


        }

        // TODO there needs to be a validity time for this strain
        // -- could be a condition on the integration step
        // TODO define how preload will be applied to this model (there could be a start time after model )

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getIncomingCompartment(): ICompartment {
        return this.compartments[0];
    }

    getOutgoingCompartment(): ICompartment {
        return this.compartments[this.compartments.length - 1];
    }

    getCompartments(): ICompartment[] {
        return this.compartments;
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
        this.compartments.forEach(compartmentInfectious => {
            nrmInfectious += modelState.getNrmValue(compartmentInfectious) * compartmentInfectious.getReproductionRatio().getRate(dT); // compartmentInfectious.getReproductionRatio().getR0() * dT / compartmentInfectious.getReproductionRatio().getDuration();
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
        this.compartments.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        return initialState;
    }

    isValid(): boolean {
        throw new Error('NI');
    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = ModelState.empty();
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT, modificationTime));
        });
        return result;
    }

}
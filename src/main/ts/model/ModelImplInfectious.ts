import { CompartmentChain } from './compartment/CompartmentChain';
import { CompartmentInfectious } from './compartment/CompartmentInfectious';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ICompartment } from './compartment/ICompartment';
import { IConnectable } from './compartment/IConnectable';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelImplStrain } from './ModelImplStrain';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { StrainUtil } from '../util/StrainUtil';
import { Demographics } from '../common/demographics/Demographics';

export class ModelImplInfectious implements IModelSeir, IConnectable {

    private readonly parentModel: ModelImplStrain;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;

    private readonly compartments: CompartmentInfectious[];
    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplStrain, modelSettings: Demographics, ageGroup: AgeGroup, strain: IModificationValuesStrain, overallMultiplier: number, incidenceMultiplier: number) {

        this.parentModel = parentModel;
        this.compartments = [];
        this.integrationSteps = [];

        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();

        // make some assumptions about initial cases
        // TODO strains entering later than min-time must not have instance-multipliers
        const dailyCases = strain.incidence * incidenceMultiplier * overallMultiplier * ageGroup.getAbsValue() / 700000;
        const durationLatent = StrainUtil.calculateLatency(strain.serialInterval, strain.intervalScale);
        const durationInfect = StrainUtil.calculateInfecty(strain.serialInterval, strain.intervalScale);

        const absExposed = dailyCases * durationLatent; // an estimate for exposure for the age group and strain
        const absInfected = dailyCases * durationInfect;

        this.nrmValue = (absExposed + absInfected) / this.absTotal;

        // console.log('groupModel initialized', ageGroup.getName(), strain.name, 'exposed', absExposed.toFixed(2), 'infected', absInfected.toFixed(2));

        const compartmentParams = CompartmentChain.getInstance().getStrainedCompartmentParams(strain);

        let reproductionSum = 0;
        let durationSum = 0;
        let i0NormalSum = 0;
        let i0AbsoluteSum = 0

        /**
         * build compartments
         */
        compartmentParams.forEach(compartmentParam => {

            const duration = compartmentParam.instantB - compartmentParam.instantA;

            reproductionSum += compartmentParam.reproduction;
            durationSum += duration;
            i0NormalSum += compartmentParam.i0Normal;

            if (compartmentParam.type === ECompartmentType.E_____EXPOSED) {
                this.compartments.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absExposed, this.ageGroupIndex, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));
            } else {
                i0AbsoluteSum += absInfected * compartmentParam.i0Normal;
                this.compartments.push(new CompartmentInfectious(compartmentParam.type, this.absTotal, absInfected * compartmentParam.i0Normal, this.ageGroupIndex, compartmentParam.reproduction, duration, compartmentParam.presymptomatic));
            }

        });

        /**
         * connect compartments among each other
         */
        for (let compartmentIndex = 1; compartmentIndex < this.compartments.length; compartmentIndex++) {

            const sourceCompartment = this.compartments[compartmentIndex - 1];
            const targetCompartment = this.compartments[compartmentIndex]; // may resolve to null, in which case values will simply be non-continued in this model
            this.integrationSteps.push({
                apply: (modelState: IModelState, dT: number, tT: number) => {
                    const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(sourceCompartment);
                    const increments = ModelState.empty();
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (targetCompartment) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }
                    if (sourceCompartment.isPreSymptomatic() && !targetCompartment.isPreSymptomatic()) {
                        const compartmentCases = this.getRootModel().getIncidenceModel(this.ageGroupIndex).getIncomingCompartment();
                        increments.addNrmValue(continuationValue, compartmentCases);
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
        throw new Error('Method not implemented.');
    }

    apply(state: IModelState, dT: number, tT: number): IModelState {
        const result = ModelState.empty();
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT));
        });
        return result;
    }

}
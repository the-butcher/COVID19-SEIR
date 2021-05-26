import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { TimeUtil } from '../util/TimeUtil';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplRoot } from './ModelImplRoot';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

export class ModelImplVaccination implements IModelSeir {

    private readonly parentModel: ModelImplRoot;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;

    private readonly groupPriority: number;
    private readonly nrmRefusal: number;

    private readonly compartmentImmunizing: CompartmentBase;
    private readonly compartmentImmunizedS: CompartmentBase;
    private readonly compartmentImmunizedD: CompartmentBase;
    private readonly compartmentImmunizedU: CompartmentBase;
    private integrationStep: IModelIntegrationStep;

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, ageGroup: AgeGroup, percentageRefusal: number) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.groupPriority = Math.pow(ageGroup.getVacc(), 5);
        this.nrmRefusal = percentageRefusal * this.ageGroupTotal / this.absTotal;
        console.log('nrmRefusal', ageGroup.getName(), percentageRefusal);

        this.compartmentImmunizing = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID_ALL, TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.VACCINATION_TO_IMMUNITY_DAYS);
        this.compartmentImmunizedS = new CompartmentBase(ECompartmentType.R___REMOVED_V, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID_ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentImmunizedD = new CompartmentBase(ECompartmentType.R___REMOVED_D, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID_ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentImmunizedU = new CompartmentBase(ECompartmentType.R___REMOVED_U, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID_ALL, CompartmentChain.NO_CONTINUATION);
        this.integrationStep = {
            apply: (modelState: IModelState, dT: number, tT: number) => {
                const continuationRate = this.compartmentImmunizing.getContinuationRatio().getRate(dT, tT);
                const continuationValue = continuationRate * modelState.getNrmValue(this.compartmentImmunizing);
                const increments = ModelState.empty();
                increments.addNrmValue(-continuationValue, this.compartmentImmunizing);
                increments.addNrmValue(+continuationValue, this.compartmentImmunizedS);
                return increments;
            }
        }

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getGroupPriority(): number {
        return this.groupPriority;
    }

    /**
     *
     * get this model's compartment holding population vaccinated, but not immune yet, therefore still susceptible
     * @returns
     */
    getCompartmentImmunizing(): CompartmentBase {
        return this.compartmentImmunizing;
    }

    getCompartmentImmunizedS(): CompartmentBase {
        return this.compartmentImmunizedS;
    }

    getCompartmentImmunizedD(): CompartmentBase {
        return this.compartmentImmunizedD;
    }

    getCompartmentImmunizedU(): CompartmentBase {
        return this.compartmentImmunizedU;
    }

    getNrmRefusal(): number {
        return this.nrmRefusal;
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
        initialState.addNrmValue(this.compartmentImmunizing.getNrmValue(), this.compartmentImmunizing);
        initialState.addNrmValue(this.compartmentImmunizedS.getNrmValue(), this.compartmentImmunizedS);
        return initialState;
    }

    isValid(): boolean {
        throw new Error('Method not implemented.');
    }

    /**
     *
     * @param state handle internal transfer (vaccination1 to vaccination2)
     * @param dT
     * @param tT
     * @returns
     */
    apply(state: IModelState, dT: number, tT: number): IModelState {

        const result = ModelState.empty();
        result.add(this.integrationStep.apply(state, dT, tT));
        return result;

    }


}
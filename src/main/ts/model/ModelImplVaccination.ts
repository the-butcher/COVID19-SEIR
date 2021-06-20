import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { BaseData } from './basedata/BaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelInstants } from './ModelInstants';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

export class ModelImplVaccination implements IModelSeir {

    private readonly parentModel: ModelImplRoot;
    private readonly absTotal: number;

    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;
    private readonly ageGroupName: string;

    private groupPriority: number;
    private readonly grpAccept: number;

    private readonly compartmentImmunizing: CompartmentBase;
    private readonly compartmentImmunizedV: CompartmentBase;
    private integrationStep: IModelIntegrationStep;

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();
        this.grpAccept = ageGroup.getAcpt();

        const instantDst = ModelInstants.getInstance().getMinInstant();
        const instantPre = instantDst - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.PRELOAD_________________DAYS;
        const category1 = TimeUtil.formatCategoryDate(instantPre + TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.VACCINATION_TO_IMMUNITY_DAYS);
        const category2 = TimeUtil.formatCategoryDate(instantPre);

        const vacc1 = BaseData.getInstance().findBaseData(category1)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
        const vacc2 = BaseData.getInstance().findBaseData(category2)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];

        if (vacc1 > 0 && vacc2 > 0) {
            const vaccM = this.ageGroupTotal * this.grpAccept; // vaccination maximum
            const vaccR = vacc2 / vaccM; // vaccination ratio
            this.groupPriority = vaccR < 1 ? (vacc1 - vacc2) / (1 - vaccR) : 1; // rough estimation of priority
        } else {
            this.groupPriority = 10000; // TODO magic number, don't know if another settings would be fine with that number too
        }

        // console.log('vaccR',  this.ageGroupIndex, this.groupPriority);

        this.compartmentImmunizing = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.absTotal, vacc1 - vacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.VACCINATION_TO_IMMUNITY_DAYS);
        this.compartmentImmunizedV = new CompartmentBase(ECompartmentType.R___REMOVED_V, this.absTotal, vacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.integrationStep = {
            apply: (modelState: IModelState, dT: number, tT: number) => {
                const continuationRate = this.compartmentImmunizing.getContinuationRatio().getRate(dT, tT);
                const continuationValue = continuationRate * modelState.getNrmValue(this.compartmentImmunizing);
                const increments = ModelState.empty();
                increments.addNrmValue(-continuationValue, this.compartmentImmunizing);
                increments.addNrmValue(+continuationValue, this.compartmentImmunizedV);
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

    getCompartmentImmunizedV(): CompartmentBase {
        return this.compartmentImmunizedV;
    }

    getGrpAccept(): number {
        return this.grpAccept;
    }

    getNrmValueGroup(ageGroupIndex: number): number {
        return ageGroupIndex === this.ageGroupIndex ? this.getNrmValue() : 0;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }
    getNrmValue(): number {
        return this.compartmentImmunizedV.getNrmValue() + this.compartmentImmunizing.getNrmValue();
    }
    getAbsValue(): number {
        return this.getNrmValue() * this.absTotal;
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
        initialState.addNrmValue(this.compartmentImmunizedV.getNrmValue(), this.compartmentImmunizedV);
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
    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = ModelState.empty();
        result.add(this.integrationStep.apply(state, dT, tT, modificationTime));
        return result;
    }


}
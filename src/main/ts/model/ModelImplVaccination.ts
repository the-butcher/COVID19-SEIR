import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { Modifications } from '../common/modification/Modifications';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { ModificationSettings } from './../common/modification/ModificationSettings';
import { BaseData } from './calibration/BaseData';
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

    // private groupPriority: number;
    private readonly grpAccept: number;

    private readonly compartmentImmunizing: CompartmentBase;

    /**
     * coming from susceptible
     */
    private readonly compartmentImmunizedS: CompartmentBase;

    /**
     * coming from discovered
     */
    private readonly compartmentImmunizedD: CompartmentBase;

    /**
     * coming from undiscovered
     */
    private readonly compartmentImmunizedU: CompartmentBase;
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

        const modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;

        // share of people immunized in this group
        const vaccShare = vacc2 / this.ageGroupTotal;

        // total removed in this group
        const removed = BaseData.getInstance().findBaseData(category1)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_REMOVED];

        // assume equal vaccination share for removed -> total people vaccinated after infection
        const vaccD = removed * vaccShare;

        // total people vaccinated after undiscovered infection
        const vaccU = vaccD * modificationSettings.getUndetected();

        // total vaccinated minus vaccinated from removed --> vaccinated directly from susceptible
        const vaccS = vacc2 - vaccD - vaccU;

        // console.log('initial vacc', this.ageGroupName, vaccShare);
        // share of people in this age group vaccinated

        this.compartmentImmunizing = new CompartmentBase(ECompartmentType.S_SUSCEPTIBLE, this.absTotal, vacc1 - vacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.VACCINATION_TO_IMMUNITY_DAYS);
        this.compartmentImmunizedS = new CompartmentBase(ECompartmentType.R__REMOVED_VS, this.absTotal, vaccS, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentImmunizedD = new CompartmentBase(ECompartmentType.R__REMOVED_VD, this.absTotal, vaccD, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentImmunizedU = new CompartmentBase(ECompartmentType.R__REMOVED_VU, this.absTotal, vaccU, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.integrationStep = {
            apply: (modelState: IModelState, dT: number, tT: number) => {
                const continuationRate = this.compartmentImmunizing.getContinuationRatio().getRate(dT, tT);
                const continuationValue = continuationRate * modelState.getNrmValue(this.compartmentImmunizing);
                const increments = ModelState.empty();
                increments.addNrmValue(-continuationValue, this.compartmentImmunizing);
                increments.addNrmValue(+continuationValue, this.compartmentImmunizedS);

                // if (tT % TimeUtil.MILLISECONDS_PER____DAY === 0 && this.ageGroupIndex === 7) {
                //     console.log('continuationValue', TimeUtil.formatCategoryDate(tT), continuationValue, continuationValue * this.getAbsTotal());
                // }

                return increments;
            }
        }

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
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
        return this.compartmentImmunizing.getNrmValue() + this.compartmentImmunizedS.getNrmValue() + this.compartmentImmunizedD.getNrmValue() + this.compartmentImmunizedU.getNrmValue();
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
    getAgeGroupName(): string {
        return this.ageGroupName;
    }

    getInitialState(): IModelState {
        const initialState = ModelState.empty();
        initialState.addNrmValue(this.compartmentImmunizing.getNrmValue(), this.compartmentImmunizing);
        initialState.addNrmValue(this.compartmentImmunizedS.getNrmValue(), this.compartmentImmunizedS);
        initialState.addNrmValue(this.compartmentImmunizedD.getNrmValue(), this.compartmentImmunizedD);
        initialState.addNrmValue(this.compartmentImmunizedU.getNrmValue(), this.compartmentImmunizedU);
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
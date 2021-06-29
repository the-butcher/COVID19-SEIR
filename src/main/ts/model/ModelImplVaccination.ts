import { CompartmentChain } from './compartment/CompartmentChain';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { BaseData } from './calibration/BaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
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

    /**
     * pure model based --> does not match the VR1 curve, since it is a pass through compartment, continuing to VM2
     */
    private readonly compartmentV1: CompartmentBase;

    /**
     * pure model based --> should match the VR2 curve, which yet has to proof true
     */
    private readonly compartmentV2: CompartmentBase;

    private readonly compartmentVC: CompartmentBase;


    private integrationStep: IModelIntegrationStep;

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();
        this.grpAccept = ageGroup.getAcpt();

        const instantDA = ModelInstants.getInstance().getMinInstant();
        const instantDB = ModelInstants.getInstance().getMinInstant() - TimeUtil.MILLISECONDS_PER____DAY * ModelConstants.V1_TO_V2________________DAYS;
        const instantPre = ModelInstants.getInstance().getPreInstant();

        const categoryDA = TimeUtil.formatCategoryDate(instantDA);
        const categoryDB = TimeUtil.formatCategoryDate(instantDB);
        const categoryP = TimeUtil.formatCategoryDate(instantPre);

        const vaccC = BaseData.getInstance().findBaseData(categoryP)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
        // console.log('vaccC', vaccC, this.ageGroupName);

        const vacc1A = BaseData.getInstance().findBaseData(categoryDA)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
        const vacc1B = BaseData.getInstance().findBaseData(categoryDB)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
        const vacc2 = BaseData.getInstance().findBaseData(categoryDA)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];

        this.compartmentVC = new CompartmentBase(ECompartmentType.X__REMOVED_VC, this.absTotal, vaccC, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        this.compartmentV1 = new CompartmentBase(ECompartmentType.R__REMOVED_V1, this.absTotal, vacc1A - vacc1B, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, ModelConstants.V1_TO_V2________________DAYS * TimeUtil.MILLISECONDS_PER____DAY);
        this.compartmentV2 = new CompartmentBase(ECompartmentType.R__REMOVED_V2, this.absTotal, vacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        this.integrationStep = {
            apply: (modelState: IModelState, dT: number, tT: number) => {

                const continuationRate = this.compartmentV1.getContinuationRatio().getRate(dT, tT);
                const continuationValue = continuationRate * modelState.getNrmValue(this.compartmentV1);
                const increments = ModelState.empty();
                increments.addNrmValue(-continuationValue, this.compartmentV1);
                increments.addNrmValue(+continuationValue, this.compartmentV2);

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
    getCompartmentV1(): CompartmentBase {
        return this.compartmentV1;
    }

    getCompartmentV2(): CompartmentBase {
        return this.compartmentV2;
    }

    getCompartmentVC(): CompartmentBase {
        return this.compartmentVC;
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
        return this.compartmentV1.getNrmValue() + this.compartmentV2.getNrmValue(); // do not include compartmentVC
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
        initialState.addNrmValue(this.compartmentV1.getNrmValue(), this.compartmentV1);
        initialState.addNrmValue(this.compartmentV2.getNrmValue(), this.compartmentV2);
        initialState.addNrmValue(this.compartmentVC.getNrmValue(), this.compartmentVC);
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
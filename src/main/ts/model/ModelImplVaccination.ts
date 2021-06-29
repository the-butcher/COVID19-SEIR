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
    private readonly compartmentsV1: CompartmentBase[];

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

        const instantPre = ModelInstants.getInstance().getPreInstant();

        const categoryP = TimeUtil.formatCategoryDate(instantPre);

        const vaccC = BaseData.getInstance().findBaseData(categoryP)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
        this.compartmentVC = new CompartmentBase(ECompartmentType.X__REMOVED_VC, this.absTotal, vaccC, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        this.compartmentsV1 = [];

        let instantDA = ModelInstants.getInstance().getMinInstant();
        let categoryDA = TimeUtil.formatCategoryDate(instantDA);
        const vacc2 = BaseData.getInstance().findBaseData(categoryDA)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];

        for (let weekIndex = 0; weekIndex < ModelConstants.V1_TO_V2_______________WEEKS; weekIndex++) {

            // instantDA = ModelInstants.getInstance().getMinInstant();
            // categoryDA = TimeUtil.formatCategoryDate(instantDA);

            const instantDB = instantDA - TimeUtil.MILLISECONDS_PER____DAY * 7;
            const categoryDB = TimeUtil.formatCategoryDate(instantDB);
            const vacc1A = BaseData.getInstance().findBaseData(categoryDA)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
            const vacc1B = BaseData.getInstance().findBaseData(categoryDB)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];

            this.compartmentsV1.push(new CompartmentBase(ECompartmentType.R__REMOVED_V1, this.absTotal, (vacc1A - vacc1B) / 2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, 7 * TimeUtil.MILLISECONDS_PER____DAY));

            instantDA = instantDB;
            categoryDA = TimeUtil.formatCategoryDate(instantDA);

        }

        this.compartmentV2 = new CompartmentBase(ECompartmentType.R__REMOVED_V2, this.absTotal, vacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        this.integrationStep = {
            apply: (modelState: IModelState, dT: number, tT: number) => {

                const increments = ModelState.empty();
                for (let weekIndex = 0; weekIndex < ModelConstants.V1_TO_V2_______________WEEKS; weekIndex++) {

                    const compartmentSrc = this.compartmentsV1[weekIndex];
                    const compartmentDst = weekIndex === ModelConstants.V1_TO_V2_______________WEEKS - 1 ? this.compartmentV2 : this.compartmentsV1[weekIndex + 1];

                    const continuationRate = compartmentSrc.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(compartmentSrc);
                    increments.addNrmValue(-continuationValue, compartmentSrc);
                    increments.addNrmValue(+continuationValue, compartmentDst);

                }
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
    // getCompartmentV1(): CompartmentBase {
    //     return this.compartmentsV1[0];
    // }

    getCompartmentsV1(): CompartmentBase[] {
        return this.compartmentsV1;
    }

    // getCompartmentV2(): CompartmentBase {
    //     return this.compartmentV2;
    // }

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
        let nrmValue = 0;
        this.compartmentsV1.forEach(compartmentV1 => {
            nrmValue += compartmentV1.getNrmValue();
        });
        nrmValue += this.compartmentV2.getNrmValue();
        return nrmValue;
        // return this.compartmentV1.getNrmValue() + this.compartmentV2.getNrmValue(); // do not include compartmentVC
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
        this.compartmentsV1.forEach(compartmentV1 => {
            initialState.addNrmValue(compartmentV1.getNrmValue(), compartmentV1);
        });
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
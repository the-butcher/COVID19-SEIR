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

    /**
     * pure model based --> does not match the VR1 curve, since it is a pass through compartment, continuing to VM2
     */
    private readonly compartmentsV1: CompartmentBase[];

    /**
     * pure model based --> should match the VR2 curve, which yet has to proof true
     */
    private readonly compartmentV2: CompartmentBase;


    // private readonly compartmentVD: CompartmentBase;
    // private readonly compartmentVU: CompartmentBase;

    private readonly compartmentVC: CompartmentBase;


    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();

        const instantPre = ModelInstants.getInstance().getPreInstant();

        const categoryP = TimeUtil.formatCategoryDate(instantPre);

        // the "control" compartment shows absolute number of first vaccinations
        const absVaccC = BaseData.getInstance().findBaseData(categoryP)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
        this.compartmentVC = new CompartmentBase(ECompartmentType.X__REMOVED_VC, this.absTotal, absVaccC, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        // this.compartmentVD = new CompartmentBase(ECompartmentType.R__REMOVED_ID, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, vacc1ToVacc2Weeks * TimeUtil.MILLISECONDS_PER___WEEK);
        // this.compartmentVU = new CompartmentBase(ECompartmentType.R__REMOVED_IU, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, vacc1ToVacc2Weeks * TimeUtil.MILLISECONDS_PER___WEEK);

        this.compartmentsV1 = [];
        this.integrationSteps = [];

        const categoryPre = TimeUtil.formatCategoryDate(instantPre);
        const absVacc2 = BaseData.getInstance().findBaseData(categoryPre)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];


        let vacc1ToVacc2Weeks = ModelConstants.V1_TO_V2_______________WEEKS; // Math.round((instantPre - instantV12Cur) / TimeUtil.MILLISECONDS_PER___WEEK);
        if (this.ageGroupIndex === 9) {
            vacc1ToVacc2Weeks = 5;
        }

        const absVacc1Total = absVaccC - absVacc2;

        const vacc2ABs: number[] = [];
        for (let weekIndex = 0; weekIndex < vacc1ToVacc2Weeks; weekIndex++) {

            const instantV2A = ModelInstants.getInstance().getPreInstant() + (weekIndex + 0) * TimeUtil.MILLISECONDS_PER___WEEK;
            const instantV2B = ModelInstants.getInstance().getPreInstant() + (weekIndex + 1) * TimeUtil.MILLISECONDS_PER___WEEK;

            const categoryV2A = TimeUtil.formatCategoryDate(instantV2A);
            const categoryV2B = TimeUtil.formatCategoryDate(instantV2B);

            const baseDataV2A = BaseData.getInstance().findBaseData(categoryV2A);
            const baseDataV2B = BaseData.getInstance().findBaseData(categoryV2B);

            if (baseDataV2A && baseDataV2B) {
                const absVacc2A = baseDataV2A[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
                const absVacc2B = baseDataV2B[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];
                vacc2ABs.push(absVacc2B  - absVacc2A);
            } else {
                vacc2ABs.push(0);
                console.warn('failed to find base data', this.ageGroupName, TimeUtil.formatCategoryDate(instantV2A), ' >> ',  TimeUtil.formatCategoryDate(instantV2B));
            }


        }

        // console.log(this.ageGroupName, 'vacc2ABs', vacc2ABs);
        let vacc2ABSum = 0;
        vacc2ABs.forEach(vacc2AB => {
            vacc2ABSum += vacc2AB;
        });

        const vaccMult = vacc2ABSum > 0 ? absVacc1Total / vacc2ABSum : 0;
        // console.log(vacc2ABSum, absVacc1Total, vaccMult)

        for (let weekIndex = vacc1ToVacc2Weeks - 1; weekIndex >= 0; weekIndex--) {
            // console.log(vacc2ABs[weekIndex] * vaccMult, absVacc1Total / vacc1ToVacc2Weeks)
            this.compartmentsV1.push(new CompartmentBase(ECompartmentType.R__REMOVED_V1, this.absTotal, vacc2ABs[weekIndex] * vaccMult, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, TimeUtil.MILLISECONDS_PER___WEEK));
        }
        this.compartmentV2 = new CompartmentBase(ECompartmentType.R__REMOVED_V2, this.absTotal, absVacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        this.integrationSteps.push({
            apply: (modelState: IModelState, dT: number, tT: number) => {

                const increments = ModelState.empty();
                for (let weekIndex = 0; weekIndex < vacc1ToVacc2Weeks; weekIndex++) {

                    const compartmentSrc = this.compartmentsV1[weekIndex];
                    const compartmentDst = weekIndex === vacc1ToVacc2Weeks - 1 ? this.compartmentV2 : this.compartmentsV1[weekIndex + 1];

                    const continuationRate = compartmentSrc.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(compartmentSrc);
                    increments.addNrmValue(-continuationValue, compartmentSrc);
                    increments.addNrmValue(+continuationValue, compartmentDst);

                }
                return increments;

            }
        });
        // this.integrationSteps.push({
        //     apply: (modelState: IModelState, dT: number, tT: number) => {

        //         const increments = ModelState.empty();

        //         const compartmentSrc = this.compartmentVD;
        //         const compartmentDst = this.compartmentV2;

        //         const continuationRate = compartmentSrc.getContinuationRatio().getRate(dT, tT);
        //         const continuationValue = continuationRate * modelState.getNrmValue(compartmentSrc);
        //         increments.addNrmValue(-continuationValue, compartmentSrc);
        //         increments.addNrmValue(+continuationValue, compartmentDst);

        //         return increments;

        //     }
        // });
        // this.integrationSteps.push({
        //     apply: (modelState: IModelState, dT: number, tT: number) => {

        //         const increments = ModelState.empty();

        //         const compartmentSrc = this.compartmentVU;
        //         const compartmentDst = this.compartmentV2;

        //         const continuationRate = compartmentSrc.getContinuationRatio().getRate(dT, tT);
        //         const continuationValue = continuationRate * modelState.getNrmValue(compartmentSrc);
        //         increments.addNrmValue(-continuationValue, compartmentSrc);
        //         increments.addNrmValue(+continuationValue, compartmentDst);

        //         return increments;

        //     }
        // });

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getCompartmentsV1(): CompartmentBase[] {
        return this.compartmentsV1;
    }

    getCompartmentV2(): CompartmentBase {
        return this.compartmentV2;
    }

    getCompartmentVC(): CompartmentBase {
        return this.compartmentVC;
    }

    // getCompartmentVD(): CompartmentBase {
    //     return this.compartmentVD;
    // }

    // getCompartmentVU(): CompartmentBase {
    //     return this.compartmentVU;
    // }

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
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT, modificationTime));
        });
        // result.add(this.integrationStep.apply(state, dT, tT, modificationTime));
        return result;
    }


}
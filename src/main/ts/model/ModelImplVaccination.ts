import { ModificationVaccination } from './../common/modification/ModificationVaccination';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { Modifications } from '../common/modification/Modifications';
import { ModificationTime } from '../common/modification/ModificationTime';
import { StrainUtil } from './../util/StrainUtil';
import { TimeUtil } from './../util/TimeUtil';
import { BaseData } from './calibration/BaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelInstants } from './ModelInstants';
import { RationalDurationFixed } from './rational/RationalDurationFixed';
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

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, modifications: Modifications, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();
        this.compartmentsV1 = [];
        this.integrationSteps = [];

        const instantPre = ModelInstants.getInstance().getPreInstant();
        const categoryPre = TimeUtil.formatCategoryDate(instantPre);

        // the "control" compartment shows absolute number of first vaccinations
        const absVacc1 = BaseData.getInstance().findBaseData(categoryPre)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
        const absVacc2 = BaseData.getInstance().findBaseData(categoryPre)[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC2ND];

        this.compartmentVC = new CompartmentBase(ECompartmentType.X__REMOVED_VC, this.absTotal, absVacc1, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);



        // iterate backwards to find a point in time at which there were as many 1st vaccinations as there are now 2nd
        let instantRev = instantPre;
        let absVacc1Rev = absVacc1;
        while (absVacc1Rev > absVacc2) {
            const categoryRev = TimeUtil.formatCategoryDate(instantRev);
            const baseDataRev = BaseData.getInstance().findBaseData(categoryRev);
            absVacc1Rev = baseDataRev[this.ageGroupName][ModelConstants.BASE_DATA_INDEX_VACC1ST];
            instantRev -= TimeUtil.MILLISECONDS_PER____DAY;
        }

        const modificationVaccination = modifications.findModificationsByType('VACCINATION')[0] as ModificationVaccination;
        const modificationValues = modificationVaccination.getVaccinationConfig(this.ageGroupName);

        const absVacc0 = absVacc1Rev * modificationValues.sC;
        const v0 = StrainUtil.calculateR0(absVacc0, absVacc1 - (absVacc1Rev - absVacc0), instantRev, instantPre, 1);
        // const v0 = StrainUtil.calculateR0(absVacc1Rev, absVacc1, instantRev, instantPre, 1);

        // console.log('expect', absVacc1 - absVacc2, 'got', absVacc1 - absVacc2, (instantPre - instantRev) / TimeUtil.MILLISECONDS_PER___WEEK, v0);
        console.log(this.ageGroupName, 'v0', v0, modificationValues.sC);

        // let absVaccDiff12 = absVacc1 - absVacc1Rev;
        let absTimeDiff12 = instantPre - instantRev;
        let compartmentCountV1 = Math.max(5, Math.round(absTimeDiff12 / TimeUtil.MILLISECONDS_PER___WEEK));
        let compartmentDuration = absTimeDiff12 / compartmentCountV1;
        let continuationRatioV1 = new RationalDurationFixed(compartmentDuration); //  * modificationValues.sD

        // console.log('elapse', instantPre - instantRev, 'cnt', compartmentCountV1, 'dur', compartmentDuration);

        // console.log(this.ageGroupName, v0)

        const vacc2ABs: number[] = [];
        let valueA = absVacc0;
        for (let compartmentIndex = 0; compartmentIndex < compartmentCountV1; compartmentIndex++) {

            const valueB = StrainUtil.calculateValueB(valueA, v0, 0, compartmentDuration, 1);
            // console.log(valueB - valueA);
            vacc2ABs.push(valueB - valueA);
            valueA = valueB;

        }
        console.log('vacc2ABs', vacc2ABs.reduce((prev, curr) => prev + curr, 0));


        const vaccMult = 1;

        for (let compartmentIndex = compartmentCountV1 - 1; compartmentIndex >= 0; compartmentIndex--) {
            // console.log(vacc2ABs[weekIndex] * vaccMult, absVacc1Total / vacc1ToVacc2Weeks)
            const compartment = new CompartmentBase(ECompartmentType.R__REMOVED_V1, this.absTotal, vacc2ABs[compartmentIndex] * vaccMult, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, continuationRatioV1);
            // console.log('compartment', compartmentIndex, compartment);
            this.compartmentsV1.push(compartment);
        }
        this.compartmentV2 = new CompartmentBase(ECompartmentType.R__REMOVED_V2, this.absTotal, absVacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

        this.integrationSteps.push({
            apply: (modelState: IModelState, dT: number, tT: number) => {

                const increments = ModelState.empty();
                for (let compartmentIndex = 0; compartmentIndex < compartmentCountV1; compartmentIndex++) {

                    const compartmentSrc = this.compartmentsV1[compartmentIndex];
                    const compartmentDst = compartmentIndex === compartmentCountV1 - 1 ? this.compartmentV2 : this.compartmentsV1[compartmentIndex + 1];

                    const continuationRate = compartmentSrc.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(compartmentSrc);
                    increments.addNrmValue(-continuationValue, compartmentSrc);
                    increments.addNrmValue(+continuationValue, compartmentDst);

                }
                return increments;

            }
        });

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
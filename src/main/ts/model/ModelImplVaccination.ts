import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from './../util/TimeUtil';
import { BaseData } from './calibration/BaseData';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChain } from './compartment/CompartmentChain';
import { ECompartmentType } from './compartment/ECompartmentType';
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
     * pure model based --> amount of immunizing at given time
     */
    private readonly compartmentI: CompartmentBase;

    /**
     * pure model based --> people fully vaccinated, should be configured to match the vacc_2 curve
     */
    private readonly compartmentV: CompartmentBase;

    /**
     * people immunized after previously having been infected
     */
    private readonly compartmentU: CompartmentBase;

    /**
     * control compartment (not contributing to model sum, but useful to validate actual vacc1 progress)
     */
    private readonly compartmentC: CompartmentBase;

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, absValueI: number, absValueU: number, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();

        const instantPre = ModelInstants.getInstance().getPreInstant();
        const categoryPre = TimeUtil.formatCategoryDate(instantPre);

        const baseDatePre = BaseData.getInstance().findBaseData(categoryPre);

        // the "control" compartment shows absolute number of first vaccinations
        const absVacc1 = BaseData.getVacc1(baseDatePre, this.ageGroupName);
        const absVacc2 = BaseData.getVacc2(baseDatePre, this.ageGroupName);

        this.compartmentC = new CompartmentBase(ECompartmentType.X__REMOVED_VC, this.absTotal, absVacc1, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentI = new CompartmentBase(ECompartmentType.R__REMOVED_VI, this.absTotal, absValueI, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentU = new CompartmentBase(ECompartmentType.R__REMOVED_VU, this.absTotal, absValueU, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);
        this.compartmentV = new CompartmentBase(ECompartmentType.R__REMOVED_V2, this.absTotal, absVacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getCompartmentI(): CompartmentBase {
        return this.compartmentI;
    }

    getCompartmentU(): CompartmentBase {
        return this.compartmentU;
    }

    getCompartmentV(): CompartmentBase {
        return this.compartmentV;
    }

    getCompartmentC(): CompartmentBase {
        return this.compartmentC;
    }

    getNrmValueGroup(ageGroupIndex: number): number {
        return ageGroupIndex === this.ageGroupIndex ? this.getNrmValue() : 0;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }

    getNrmValue(): number {
        let nrmValue = 0;
        nrmValue += this.compartmentI.getNrmValue();
        nrmValue += this.compartmentU.getNrmValue();
        nrmValue += this.compartmentV.getNrmValue();
        return nrmValue;
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
        initialState.addNrmValue(this.compartmentI.getNrmValue(), this.compartmentI);
        initialState.addNrmValue(this.compartmentU.getNrmValue(), this.compartmentU);
        initialState.addNrmValue(this.compartmentV.getNrmValue(), this.compartmentV);
        initialState.addNrmValue(this.compartmentC.getNrmValue(), this.compartmentC);
        return initialState;
    }

    /**
     * @param state handle internal transfer (vaccination1 to vaccination2)
     * @param dT
     * @param tT
     * @returns
     */
    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        return ModelState.empty();
    }

}
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
     * pure model based --> does not match the VR1 curve, since it is a pass through compartment, continuing to VM2
     */
    private readonly compartmentI: CompartmentBase;

    /**
     * pure model based --> should match the VR2 curve, which yet has to proof true
     */
    private readonly compartmentV: CompartmentBase;

    private readonly compartmentC: CompartmentBase;

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, absValueI: number, ageGroup: AgeGroup) {

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
        this.compartmentV = new CompartmentBase(ECompartmentType.R__REMOVED_V2, this.absTotal, absVacc2, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, CompartmentChain.NO_CONTINUATION);

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getCompartmentI(): CompartmentBase {
        return this.compartmentI;
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
        initialState.addNrmValue(this.compartmentV.getNrmValue(), this.compartmentV);
        initialState.addNrmValue(this.compartmentC.getNrmValue(), this.compartmentC);
        return initialState;
    }

    isValid(): boolean {
        throw new Error('Method not implemented.');
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
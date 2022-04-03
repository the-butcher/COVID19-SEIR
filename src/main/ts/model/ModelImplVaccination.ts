import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from './../util/TimeUtil';
import { CompartmentBase } from './compartment/CompartmentBase';
import { CompartmentChainReproduction } from './compartment/CompartmentChainReproduction';
import { CompartmentImmunity } from './compartment/CompartmentImmunity';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplRoot } from './ModelImplRoot';
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
     * pure model based --> amount of immunizing at given time
     */
    private readonly compartmentI: CompartmentImmunity;

    /**
     * pure model based --> amount of re-immunizing at given time
     */
    // private readonly compartmentR: CompartmentBase;

    /**
     * pure model based --> people fully vaccinated, should be configured to match the vacc_2 curve
     */
    private readonly compartmentV: CompartmentImmunity;

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, modificationTime: ModificationTime, absValueImmunizing: number, absValueVaccinated: number, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();

        const durationToReexposable = modificationTime.getReexposure() * TimeUtil.MILLISECONDS_PER____DAY * 30;

        this.compartmentI = new CompartmentImmunity(ECompartmentType.R___REMOVED_VI, this.absTotal, absValueImmunizing, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, 0, CompartmentChainReproduction.NO_CONTINUATION, '');
        // this.compartmentR = new CompartmentBase(ECompartmentType.R___REMOVED_VI, this.absTotal, 0, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, new RationalDurationFixed(3 * TimeUtil.MILLISECONDS_PER___WEEK), '');
        this.compartmentV = new CompartmentImmunity(ECompartmentType.R___REMOVED_V2, this.absTotal, absValueVaccinated, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, 1, new RationalDurationFixed(durationToReexposable), '');



    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getCompartmentI(): CompartmentImmunity {
        return this.compartmentI;
    }

    /**
     * pure model based --> people fully vaccinated
     * @returns 
     */
    getCompartmentV(): CompartmentImmunity {
        return this.compartmentV;
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
        // nrmValue += this.compartmentU.getNrmValue();
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
        // initialState.addNrmValue(this.compartmentR.getNrmValue(), this.compartmentR);
        // initialState.addNrmValue(this.compartmentU.getNrmValue(), this.compartmentU);
        initialState.addNrmValue(this.compartmentV.getNrmValue(), this.compartmentV);
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
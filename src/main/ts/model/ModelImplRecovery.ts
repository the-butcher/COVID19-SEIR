import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { ObjectUtil } from './../util/ObjectUtil';
import { IBaseDataItem } from './basedata/BaseDataItem';
import { CompartmentChainRecovery } from './compartment/CompartmentChainRecovery';
import { CompartmentRecovery } from './compartment/CompartmentRecovery';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelImplStrain } from './ModelImplStrain';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

/**
 * submodel for a single strain and single age groups (i.e. all infections with b.1.1.7 in the age-group of 25-34)
 *
 * @author h.fleischer
 * @since 31.05.2021
 */
export class ModelImplRecovery implements IModelSeir {

    private readonly parentModel: ModelImplStrain;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;

    private readonly compartmentsRecovery: CompartmentRecovery[];

    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplStrain, absTotal: number, absValue: number, ageGroup: AgeGroup, strainValues: IModificationValuesStrain) {

        this.parentModel = parentModel;
        this.compartmentsRecovery = [];
        this.integrationSteps = [];

        this.absTotal = absTotal;
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();

        const compartmentParams = CompartmentChainRecovery.getInstance().getStrainedCompartmentParams(strainValues);

        // this.nrmValue = absValue * 1.0 / this.absTotal;

        let absCompartmentRecoverySum = 0;
        for (let chainIndex = 0; chainIndex < compartmentParams.length; chainIndex++) {

            const compartmentParam = compartmentParams[chainIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            const instantC = (compartmentParam.instantA + compartmentParam.instantB) / 2;
            const absCompartment = 0; // TODO need to find logic for a meaningful prefill of the recovered comparments (but maybe it can work with empty compartments when the model starts in a low incidence situation) 
            this.compartmentsRecovery.push(new CompartmentRecovery(this.absTotal, 0 /* absValue / compartmentParams.length */, this.ageGroupIndex, strainValues.id, compartmentParam.immunity, duration, `_RCV_${ObjectUtil.padZero(chainIndex)}`));

            absCompartmentRecoverySum += absCompartment;

        };

        this.nrmValue = absCompartmentRecoverySum / this.absTotal;
        // console.log('incidenceSum', incidenceSum / 7);

        /**
         * connect infection compartments among each other
         */
        this.linkCompartmentsRecovery(this.compartmentsRecovery);



    }

    linkCompartmentsRecovery(compartmentsRecovery: CompartmentRecovery[]): void {

        /**
         * connect infection compartments among each other
         */
        for (let compartmentIndex = 0; compartmentIndex < compartmentsRecovery.length; compartmentIndex++) {

            const sourceCompartment = compartmentsRecovery[compartmentIndex];
            const targetCompartment = compartmentsRecovery[compartmentIndex + 1]; // may resolve to null, in which case values will simply be non-continued in this model
            this.integrationSteps.push({

                apply: (modelState: IModelState, dT: number, tT: number, modificationTime: ModificationTime) => {

                    const increments = ModelState.empty();

                    // const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = sourceCompartment.getContinuationRatio().getRate(dT, tT) * modelState.getNrmValue(sourceCompartment);

                    /**
                     * move from recovered compartment to next recovered compartment, if any
                     */
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (targetCompartment) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }

                    return increments;

                }

            });

        }

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getFirstCompartment(): CompartmentRecovery {
        return this.compartmentsRecovery[0];
    }

    getLastCompartment(): CompartmentRecovery {
        return this.compartmentsRecovery[this.compartmentsRecovery.length - 1];
    }

    getCompartments(): CompartmentRecovery[] {
        return this.compartmentsRecovery;
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
        this.compartmentsRecovery.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        return initialState;
    }

    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState {
        const result = ModelState.empty();
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT, modificationTime));
        });
        return result;
    }

}
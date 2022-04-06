import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { IModificationValuesStrain } from '../common/modification/IModificationValuesStrain';
import { ModificationTime } from '../common/modification/ModificationTime';
import { TimeUtil } from '../util/TimeUtil';
import { ObjectUtil } from './../util/ObjectUtil';
import { IBaseDataItem } from './basedata/BaseDataItem';
import { CompartmentChainRecovery } from './compartment/CompartmentChainRecovery';
import { CompartmentFilter } from './compartment/CompartmentFilter';
import { CompartmentImmunity } from './compartment/CompartmentImmunity';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelImplRoot } from './ModelImplRoot';
import { ModelImplStrain } from './ModelImplStrain';
import { RationalDurationFixed } from './rational/RationalDurationFixed';
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
    private readonly ageGroupName: string;
    private readonly ageGroupTotal: number;

    private readonly compartmentsRecovery: CompartmentImmunity[];

    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplStrain, absTotal: number, absValue: number, ageGroup: AgeGroup, strainValues: IModificationValuesStrain) {

        this.parentModel = parentModel;
        this.compartmentsRecovery = [];
        this.integrationSteps = [];

        this.absTotal = absTotal;
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupName = ageGroup.getName();
        this.ageGroupTotal = ageGroup.getAbsValue();

        const compartmentParams = CompartmentChainRecovery.getInstance().getStrainedCompartmentParams(strainValues.timeToWane);

        // this.nrmValue = absValue * 1.0 / this.absTotal;

        let absCompartmentRecoverySum = 0;
        for (let chainIndex = 0; chainIndex < compartmentParams.length; chainIndex++) {

            const compartmentParam = compartmentParams[chainIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            // const instantC = (compartmentParam.instantA + compartmentParam.instantB) / 2;
            const absCompartment = absValue / compartmentParams.length; // TODO need to find logic for a meaningful prefill of the recovered comparments (but maybe it can work with empty compartments when the model starts in a low incidence situation) 
            this.compartmentsRecovery.push(new CompartmentImmunity(ECompartmentType.R____RECOVERED, this.absTotal, absCompartment, this.ageGroupIndex, this.ageGroupName, strainValues.id, compartmentParam.immunity, new RationalDurationFixed(duration), `_RCV_${ObjectUtil.padZero(chainIndex)}`));

            absCompartmentRecoverySum += absCompartment;

        }

        this.nrmValue = absCompartmentRecoverySum / this.absTotal;
        // console.log('incidenceSum', incidenceSum / 7);

        /**
         * connect infection compartments among each other
         */
        this.linkCompartmentsRecovery(this.compartmentsRecovery);

    }

    linkCompartmentsRecovery(compartmentsRecovery: CompartmentImmunity[]): void {


        this.integrationSteps.push({

            apply: (modelState: IModelState, dT: number, tT: number, modificationTime: ModificationTime) => {

                const result = ModelState.empty();

                let nrmSuscp = 0;
                let nrmIncrs: number[] = [];
                for (let compartmentIndex = 0; compartmentIndex < compartmentsRecovery.length; compartmentIndex++) {
                    nrmIncrs[compartmentIndex] = 0;
                }

                const suscptCompartment = this.getRootModel().getCompartmentSusceptible(this.ageGroupIndex);
                let sourceIndex: number;
                let targetIndex: number;

                // console.log(this.ageGroupName + ' s > ' + suscptCompartment.getAgeGroupName());

                /**
                 * connect infection compartments among each other
                 */
                for (let compartmentIndex = 0; compartmentIndex < compartmentsRecovery.length; compartmentIndex++) {

                    sourceIndex = compartmentIndex;
                    targetIndex = compartmentIndex + 1;

                    const sourceCompartment = compartmentsRecovery[compartmentIndex];
                    const targetCompartment = compartmentsRecovery[compartmentIndex + 1]; // may resolve to null, in which case values will simply be non-continued in this model

                    const continuationValue = sourceCompartment.getContinuationRatio().getRate(dT, tT) * modelState.getNrmValue(sourceCompartment);

                    /**
                     * move from recovered compartment to next recovered compartment, if any
                     */
                    // increments.addNrmValue(-continuationValue, sourceCompartment);
                    nrmIncrs[compartmentIndex] = nrmIncrs[compartmentIndex] - continuationValue;

                    let targetRatio = 0;
                    let suscptRatio = 1;
                    if (targetCompartment) {

                        targetRatio = targetCompartment.getImmunity() / sourceCompartment.getImmunity();
                        suscptRatio = 1 - targetRatio;

                        // increments.addNrmValue(continuationValue * targetRatio, targetCompartment);
                        nrmIncrs[targetIndex] = nrmIncrs[targetIndex] + continuationValue * targetRatio;

                    }
                    nrmSuscp += continuationValue * suscptRatio;

                }

                for (let compartmentIndex = 0; compartmentIndex < compartmentsRecovery.length; compartmentIndex++) {
                    result.addNrmValue(nrmIncrs[compartmentIndex], compartmentsRecovery[compartmentIndex]);
                }
                result.addNrmValue(nrmSuscp, suscptCompartment);

                // console.log('res', result.getNrmValueSum(new CompartmentFilter(() => true)) * this.getAbsTotal());
                return result;

            }

        });

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getFirstCompartment(): CompartmentImmunity {
        return this.compartmentsRecovery[0];
    }

    getLastCompartment(): CompartmentImmunity {
        return this.compartmentsRecovery[this.compartmentsRecovery.length - 1];
    }

    getCompartments(): CompartmentImmunity[] {
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
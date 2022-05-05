import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';
import { ModificationTime } from '../common/modification/ModificationTime';
import { ObjectUtil } from '../util/ObjectUtil';
import { TimeUtil } from './../util/TimeUtil';
import { CompartmentChainRecovery } from './compartment/CompartmentChainRecovery';
import { CompartmentChainReproduction } from './compartment/CompartmentChainReproduction';
import { CompartmentImmunity } from './compartment/CompartmentImmunity';
import { ECompartmentType } from './compartment/ECompartmentType';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelConstants } from './ModelConstants';
import { ModelImplRoot } from './ModelImplRoot';
import { RationalDurationFixed } from './rational/RationalDurationFixed';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';

export class ModelImplVaccination implements IModelSeir {

    private readonly parentModel: ModelImplRoot;
    private readonly absTotal: number;
    private readonly nrmValue: number;

    private readonly ageGroupIndex: number;
    private readonly ageGroupTotal: number;
    private readonly ageGroupName: string;

    /**
     * pure model based --> amount of immunizing at given time
     */
    private readonly compartmentI: CompartmentImmunity;

    // /**
    //  * pure model based --> people fully vaccinated, should be configured to match the vacc_2 curve
    //  */
    // private readonly compartmentV: CompartmentImmunity;

    private readonly compartmentsVaccination: CompartmentImmunity[];
    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplRoot, modelSettings: Demographics, modificationTime: ModificationTime, absValueImmunizing: number, absValueVaccinated: number, ageGroup: AgeGroup) {

        this.parentModel = parentModel;
        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();
        this.ageGroupTotal = ageGroup.getAbsValue();
        this.ageGroupName = ageGroup.getName();

        this.compartmentsVaccination = [];
        this.integrationSteps = [];

        const timeToWane = modificationTime.getReexposure();
        const compartmentParams = CompartmentChainRecovery.getInstance().getStrainedCompartmentParams(timeToWane);
        let absCompartmentRecoverySum = 0;
        for (let chainIndex = 0; chainIndex < compartmentParams.length; chainIndex++) {

            const compartmentParam = compartmentParams[chainIndex];
            const duration = compartmentParam.instantB - compartmentParam.instantA;

            const absCompartment = absValueVaccinated / compartmentParams.length;
            this.compartmentsVaccination.push(new CompartmentImmunity(ECompartmentType.R___VACCINATED, this.absTotal, absCompartment, this.ageGroupIndex, this.ageGroupName, ObjectUtil.createId(), compartmentParam.immunity, new RationalDurationFixed(duration), `_VAC_${ObjectUtil.padZero(chainIndex)}`));

            absCompartmentRecoverySum += absCompartment;

        }
        this.linkCompartmentsVaccination(this.compartmentsVaccination);

        this.compartmentI = new CompartmentImmunity(ECompartmentType.R___IMMUNIZING, this.absTotal, absValueImmunizing, this.ageGroupIndex, this.ageGroupName, ModelConstants.STRAIN_ID___________ALL, 0, new RationalDurationFixed(TimeUtil.MILLISECONDS_PER___WEEK * 2), '');

        this.nrmValue = (absCompartmentRecoverySum + absValueImmunizing) / this.absTotal;


        // this.compartmentV = new CompartmentImmunity(ECompartmentType.R___REMOVED_V2, this.absTotal, absValueVaccinated, this.ageGroupIndex, ModelConstants.STRAIN_ID___________ALL, 1, new RationalDurationFixed(durationToReexposable), '');

    }

    linkCompartmentsVaccination(compartmentsVaccination: CompartmentImmunity[]): void {

        this.integrationSteps.push({

            apply: (modelState: IModelState, dT: number, tT: number, modificationTime: ModificationTime) => {

                const increments = ModelState.empty();

                let nrmSuscp = 0;
                let nrmIncrs: number[] = [];
                for (let compartmentIndex = 0; compartmentIndex < compartmentsVaccination.length; compartmentIndex++) {
                    nrmIncrs[compartmentIndex] = 0;
                }

                const suscptCompartment = this.getRootModel().getCompartmentSusceptible(this.ageGroupIndex);
                let targetIndex: number;

                // console.log(this.ageGroupName + ' s > ' + suscptCompartment.getAgeGroupName());

                /**
                 * connect infection compartments among each other
                 */
                for (let sourceIndex = 0; sourceIndex < compartmentsVaccination.length; sourceIndex++) {

                    targetIndex = sourceIndex + 1;

                    const sourceCompartment = compartmentsVaccination[sourceIndex];
                    const targetCompartment = compartmentsVaccination[targetIndex]; // may resolve to null, in which case values will simply be non-continued in this model

                    // const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = sourceCompartment.getContinuationRatio().getRate(dT, tT) * modelState.getNrmValue(sourceCompartment);

                    /**
                     * move from recovered compartment to next recovered compartment, if any
                     */
                    nrmIncrs[sourceIndex] = nrmIncrs[sourceIndex] - continuationValue;

                    let targetRatio = 0;
                    let suscptRatio = 1;
                    if (targetCompartment) {

                        targetRatio = targetCompartment.getImmunity() / sourceCompartment.getImmunity();
                        suscptRatio = 1 - targetRatio;

                        nrmIncrs[targetIndex] = nrmIncrs[targetIndex] + continuationValue * targetRatio;

                    }
                    nrmSuscp += continuationValue * suscptRatio;

                }

                for (let compartmentIndex = 0; compartmentIndex < compartmentsVaccination.length; compartmentIndex++) {
                    increments.addNrmValue(nrmIncrs[compartmentIndex], compartmentsVaccination[compartmentIndex]);
                }

                /**
                 * TODO :: in order to get unvaccinated vs. vaccinated incindence, there would to be separate susceptible compartments for:
                 * -- people that always susceptible
                 * -- people that had immunity from vaccination prior to being susceptible again
                 * -- people that had immunity from recovery prior to being susceptible again
                 */
                increments.addNrmValue(nrmSuscp, suscptCompartment); // add any immunity loss to susceptible

                return increments;

            }

        });

    }

    getRootModel(): ModelImplRoot {
        return this.parentModel.getRootModel();
    }

    getCompartmentI(): CompartmentImmunity {
        return this.compartmentI;
    }

    getNrmValueGroup(ageGroupIndex: number): number {
        return ageGroupIndex === this.ageGroupIndex ? this.getNrmValue() : 0;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }

    getFirstCompartment(): CompartmentImmunity {
        return this.compartmentsVaccination[0];
    }
    getLastCompartment(): CompartmentImmunity {
        return this.compartmentsVaccination[this.compartmentsVaccination.length - 1];
    }
    getCompartments(): CompartmentImmunity[] {
        return this.compartmentsVaccination;
    }

    getAbsValue(): number {
        return this.getNrmValue() * this.absTotal;
    }
    getNrmValue(): number {
        return this.nrmValue;
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
        this.compartmentsVaccination.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        initialState.addNrmValue(this.compartmentI.getNrmValue(), this.compartmentI);
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
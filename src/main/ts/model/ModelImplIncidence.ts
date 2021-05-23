import { CompartmentBase } from './compartment/CompartmentBase';
import { ECompartmentType } from './compartment/ECompartmentType';
import { ICompartment } from './compartment/ICompartment';
import { IConnectable } from './compartment/IConnectable';
import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IModelSeir } from './IModelSeir';
import { ModelImplRoot } from './ModelImplRoot';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { IModelState } from './state/IModelState';
import { ModelState } from './state/ModelState';
import { ObjectUtil } from '../util/ObjectUtil';
import { TimeUtil } from '../util/TimeUtil';
import { Demographics } from '../common/demographics/Demographics';
import { ModelImplStrain } from './ModelImplStrain';

export class ModelImplIncidence implements IModelSeir, IConnectable {

    private readonly rootModel: ModelImplRoot;
    private readonly absTotal: number;
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;

    private readonly compartments: CompartmentBase[];
    private integrationSteps: IModelIntegrationStep[];

    constructor(parentModel: ModelImplStrain, modelSettings: Demographics, initialIncidence: number, ageGroup: AgeGroup, strainId: string) {

        this.rootModel = parentModel.getRootModel();
        this.compartments = [];
        this.integrationSteps = [];

        this.absTotal = modelSettings.getAbsTotal();
        this.ageGroupIndex = ageGroup.getIndex();

        const dailyCases = initialIncidence * ageGroup.getAbsValue() / 700000;
        this.nrmValue = dailyCases * 7 / this.absTotal;

        // primary compartment (cases at the point of incubation)
        this.compartments.push(new CompartmentBase(ECompartmentType.X__INCUBATE_0, this.absTotal, dailyCases, this.ageGroupIndex, strainId, TimeUtil.MILLISECONDS_PER_DAY));

        // secondary compartments (cases propagate backwards 7 days, so an incidence can be calculated from the total sum of this model)
        for (let i = 1; i < 7; i++) {
            this.compartments.push(new CompartmentBase(ECompartmentType.X__INCUBATE_N, this.absTotal, dailyCases, this.ageGroupIndex, strainId, TimeUtil.MILLISECONDS_PER_DAY));
        }

        // console.log('cl', this.compartments.length);

        // connect compartments among each other, last compartment juts looses its population to nowhere without further propagation
        for (let compartmentIndex = 0; compartmentIndex < this.compartments.length; compartmentIndex++) {

            const sourceCompartment = this.compartments[compartmentIndex];
            const targetCompartment = this.compartments[compartmentIndex + 1]; // will evaluate to null and be caught further down
            this.integrationSteps.push({

                apply: (modelState: IModelState, dT: number, tT: number) => {

                    const continuationRate = sourceCompartment.getContinuationRatio().getRate(dT, tT);
                    const continuationValue = continuationRate * modelState.getNrmValue(sourceCompartment);
                    const increments = ModelState.empty();
                    increments.addNrmValue(-continuationValue, sourceCompartment);
                    if (ObjectUtil.isNotEmpty(targetCompartment)) {
                        increments.addNrmValue(continuationValue, targetCompartment);
                    }
                    return increments;

                }

            });

        }

    }

    getRootModel(): ModelImplRoot {
        return this.rootModel;
    }

    getIncomingCompartment(): ICompartment {
        return this.compartments[0];
    }

    getOutgoingCompartment(): ICompartment {
        return this.compartments[this.compartments.length - 1];
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

    getInitialState(): IModelState {
        const initialState = ModelState.empty();
        this.compartments.forEach(compartment => {
            initialState.addNrmValue(compartment.getNrmValue(), compartment);
        });
        return initialState;
    }

    isValid(): boolean {
        throw new Error('Method not implemented.');
    }

    apply(state: IModelState, dT: number, tT: number): IModelState {
        const result = ModelState.empty();
        this.integrationSteps.forEach(integrationStep => {
            result.add(integrationStep.apply(state, dT, tT));
        });
        return result;
    }

}
import { ICompartment } from '../compartment/ICompartment';
import { ICompartmentFilter } from '../compartment/ICompartmentFilter';
import { IModelState } from './IModelState';

/**
 * description of a specific model-state, mutable through model-integration
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class ModelState implements IModelState {

    static copy(other: IModelState): IModelState {
        return ModelState.empty().add(other);
    }

    static empty(): IModelState {
        return new ModelState();
    }

    private readonly valuesByCompartments: Map<ICompartment, number>;

    private constructor() {
        this.valuesByCompartments = new Map();
    }

    getCompartments(): ICompartment[] {
        return [...this.valuesByCompartments.keys()];
    }

    addNrmValue(value: number, compartment: ICompartment): void {
        this.valuesByCompartments.set(compartment, this.getNrmValue(compartment) + value);
    }

    getNrmValue(compartment: ICompartment): number {
        return this.valuesByCompartments.get(compartment) || 0;
    }

    add(other: IModelState): IModelState {
        other.getCompartments().forEach(compartment => {
            this.addNrmValue(other.getNrmValue(compartment), compartment);
        });
        return this;
    }

    getNrmValueSum(compartmentFilter: ICompartmentFilter): number {
        let normalizedValueSum = 0;
        this.valuesByCompartments.forEach((value, compartment) => {
            if (compartmentFilter.test(compartment)) {
                normalizedValueSum += this.getNrmValue(compartment);
            }
        });
        return normalizedValueSum;
    }

    getR0(tT: number): number {

        // collect all possible strains
        // TODO SeirModelGroup has such code already

        // TODO calculate a weighed average
        throw new Error("NI");
        // const shareOfB117 = this.getShareOfB117();
        // const shareOfCov2 = 1 - shareOfB117;
        // const rEfft0 = this.model.getREffCov2() * shareOfCov2 + this.model.getREffB117() * shareOfB117;
        // return rEfft0 * this.model.getInterventionSet().getMultiplier(tT);

    }

    getRt(tT: number): number {
        throw new Error("NI"); // return this.getR0(tT) * this.getPopulation(CompartmentFilter.type(ECompartmentType2.S_SUSCEPTIBLE)).getNormalized();
    }

}
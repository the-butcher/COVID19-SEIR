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

    protected readonly valuesByCompartments: Map<ICompartment, number>;

    private constructor() {
        this.valuesByCompartments = new Map();
    }

    getValuesByCompartments(): Map<ICompartment, number> {
        return this.valuesByCompartments;
    }

    addNrmValue(value: number, compartment: ICompartment): void {
        this.valuesByCompartments.set(compartment, this.getNrmValue(compartment) + value);
    }

    getNrmValue(compartment: ICompartment): number {
        return this.valuesByCompartments.get(compartment) || 0;
    }

    add(other: IModelState): IModelState {
        other.getValuesByCompartments().forEach((value, compartment) => {
            this.addNrmValue(value, compartment);
        });
        return this;
    }

    getNrmValueSum(compartmentFilter: ICompartmentFilter): number {
        let normalizedValueSum = 0;
        this.valuesByCompartments.forEach((value, compartment) => {
            if (compartmentFilter.test(compartment)) {
                normalizedValueSum += value;
            }
        });
        return normalizedValueSum;
    }

}
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
        return new ModelState(other.getNrmValuesByCompartment());
    }

    static empty(): IModelState {
        return new ModelState(new Map());
    }

    protected readonly valuesByCompartments: Map<ICompartment, number>;

    private constructor(valuesByCompartments: Map<ICompartment, number>) {
        this.valuesByCompartments = new Map(valuesByCompartments);
        // valuesByCompartments.forEach((value, key) => {
        //     this.valuesByCompartments.set(key, value);
        // })
    }

    toJSON(): { [K: string]: number } {
        const json: { [K: string]: number } = {};
        this.valuesByCompartments.forEach((value, compartment) => {
            json[compartment.getId()] = value;
        });
        return json;
    }

    getNrmValuesByCompartment(): Map<ICompartment, number> {
        return this.valuesByCompartments;
    }

    addNrmValue(value: number, compartment: ICompartment): void {
        this.valuesByCompartments.set(compartment, this.getNrmValue(compartment) + value);
    }

    getNrmValue(compartment: ICompartment): number {
        return this.valuesByCompartments.get(compartment) || 0;
    }

    add(other: IModelState): IModelState {
        other.getNrmValuesByCompartment().forEach((value, compartment) => {
            this.addNrmValue(value, compartment);
        });
        return this;
    }

    getNrmValueSum(compartmentFilter: ICompartmentFilter): number {
        let normalizedValueSum = 0;
        // find all compartment id's satisfying the given filter (the ids found for a given filter could be associated, and reused, with a filter to speed up repeated filtering)
        this.valuesByCompartments.forEach((value, compartment) => {
            if (compartmentFilter.test(compartment)) {
                normalizedValueSum += value;
            }
        });
        return normalizedValueSum;
    }

}
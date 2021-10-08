import { ICompartment } from '../compartment/ICompartment';
import { ICompartmentFilter } from '../compartment/ICompartmentFilter';

/**
 * definition for types that define a specific model-state in the integration process
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export interface IModelState {

    /**
     * serialize this instance to a writable json structure
     */
    toJSON(): { [K: string]: number };

    /**
     * adds another state to this state (modifies this state)
     * @param state
     */
    add(state: IModelState): IModelState;

    /**
     * store the given value with the given compartment, adding it to an existing value, if present
     * @param value
     * @param compartment
     */
    addNrmValue(value: number, compartment: ICompartment): void;

    /**
     * get the normalized value of the given compartment
     * @param compartment
     */
    getNrmValue(compartment: ICompartment): number;

    /**
     * get all compartment values
     */
    getNrmValuesByCompartment(): Map<ICompartment, number>;

    /**
     * get the normalized value of all compartments satisfying the given filter
     * @param compartmentFilter
     */
    getNrmValueSum(compartmentFilter: ICompartmentFilter): number;

}
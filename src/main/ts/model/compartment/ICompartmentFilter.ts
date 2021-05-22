import { ICompartment } from './ICompartment';

/**
 * definition for types that can filter compartments
 * a single test-method required and the actual filter criteria is up to the implementation
 *
 * @author h.fleischer
 * @since 24.04.2021
 */
export interface ICompartmentFilter {
    test(compartment: ICompartment): boolean;
}
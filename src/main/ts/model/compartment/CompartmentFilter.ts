import { ECompartmentType } from './ECompartmentType';
import { ICompartment } from './ICompartment';
import { ICompartmentFilter } from './ICompartmentFilter';

/**
 * implementation of ICompartmentFilter able to apply multiple criteria
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class CompartmentFilter implements ICompartmentFilter {

    static readonly ALL = new CompartmentFilter(() => true);

    static type(compartmentType: ECompartmentType): ICompartmentFilter  {
        return new CompartmentFilter(compartment => compartment.getCompartmentType() === compartmentType);
    }

    static all(): ICompartmentFilter  {
        return new CompartmentFilter();
    }

    static ageGroup(ageGroupIndex: number): ICompartmentFilter  {
        return new CompartmentFilter(compartment => compartment.getAgeGroupIndex() === ageGroupIndex);
    }

    private readonly typeFilters: Array<(compartment: ICompartment) => boolean>

    constructor(...typeFilters: Array<(compartment: ICompartment) => boolean>) {
        this.typeFilters = typeFilters;
    }

    test(compartment: ICompartment): boolean {
        return this.typeFilters.every(f => f.apply(null, [compartment]));
    }

}
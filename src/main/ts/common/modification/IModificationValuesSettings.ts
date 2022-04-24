import { IModificationValues } from './IModificationValues';


/**
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesSettings extends IModificationValues {

    /**
     * initial ratio of undiscovered cases with regard to total cases
     */
    undetected: number;

    /**
     * a ratio of population that will quarantine after a positive test, thus reducing further spread
     */
    quarantine: number;

    /**
     * unused
     */
    dead: number;

    /**
     * time to reexposable after vaccination (months)
     */
    reexposure: number;


    /**
     * the exponent of the discovery function
     */
    pow: number;

    /**
     * maximum assumed discovery at very low positivity rates
     */
    max: number;

    /**
     * the base slope of discovery (modified by tests/100000 and age-group, TODO: specify a base tests/100.000 reference value)
     */
    xmb: number;

    /**
     * modifier for test-rate
     */
    xmr: number;

    /**
     * equation params calculated from discovery rates over the part of the model where data is known
     */
    reg?: number[];

}
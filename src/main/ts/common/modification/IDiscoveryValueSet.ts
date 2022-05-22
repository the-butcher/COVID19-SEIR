export interface IDiscoveryValueSet {


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

}
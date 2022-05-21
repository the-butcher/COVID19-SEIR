import { IModificationValues } from './IModificationValues';


/**
 * definition for parameters defining a live IStrain instance
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesStrain extends IModificationValues {

    /**
     * get the base reproduction number of this strain
     */
    r0: number;

    /**
     * is this the primary strain in the model (the first strain and as such not-deletable)
     */
    primary: boolean;

    /**
     * get the serial interval of this strain
     */
    serialInterval: number;

    /**
     * get the interval scale of this strain (basically a "stretch")
     */
    intervalScale: number;

    /**
     * get the ratio of immune escape for this strain
     * 0 would mean, no recovered or vaccinated individual would be infected until immunity has vanished
     * @deprecated
     */
    immuneEscape: number;

    /**
     * time in months for total waning of immunity
     */
    timeToWane: number;

    // 0.1+0.2\ \frac{x}{9}\ +\ 0.7\left(\frac{x}{9}\right)^{9}

    /**
     * the initial incidence of this strain
     */
    dstIncidence: number;

    preIncidence?: number;

    /**
     * calculated incidences at preload time
     */
    preIncidences?: number[];

    /**
     * target reproduction rates at preload time
     */
    preGrowthRate?: number[];

    transmissionRisk?: number;

    /**
     * the exponent of the discovery function (attention, used as negative number)
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
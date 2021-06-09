/**
 * definition for types that hold configuration for an age-group
 *
 * @author h.fleischer
 * @since 21.05.2021
 */
export interface IAgeGroupConfig {

    /**
     * priority for vaccination
     */
    prio: number;

    /**
     * human readable name of the group
     */
    name: string;

    /**
     * group population
     */
    pG: number;

}
/**
 * definition for types that can provide a ratio for a given duration at a given time
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export interface IRational {

    /**
     *
     * @param dT the duration for which to calculate
     * @param tT the time at which to calculate
     */
    getRate(dT: number, tT: number): number;

    // /**
    //  * get the base-duration of this compartment
    //  */
    // getDuration(): number;

}
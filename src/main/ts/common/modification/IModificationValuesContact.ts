import { IModificationValues } from './IModificationValues';

export interface IPidValues {

    /**
     * proportional control
     */
    kp: number;

     /**
     * integral control
     */
    ki: number;

    /**
     * derivative control
     */
    kd: number;

    /**
     * integral error
     */
     ei: number;

    /**
     * proportional error
     */
    ep: number;

    // no derivative error on purpose

}

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesContact extends IModificationValues {

    /**
     * category multipliers, normalized values between 0 and 1
     */
    multipliers: { [K in string] : number };

    /**
     * optionally, additional multiplier that may increase weight of a given age-group in a specific modification
     */
    corrections?: { [K in string] : { [K in string] : number } };

    mult___pids?: { [K in string] : IPidValues };

    corr___pids?: { [K in string] :  { [K in string] : IPidValues } };

}
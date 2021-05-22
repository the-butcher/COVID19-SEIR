import { IModificationValues } from './IModificationValues';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesTesting extends IModificationValues {

    /**
     * category multipliers, normalized values between 0 and 1
     */
    multipliers: { [K in string] : number };

}
import { IModificationValues } from './IModificationValues';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesDiscovery extends IModificationValues {

    factorWeight: number;

    /**
     * consumed from data
     */
    testRate: number;

    /**
     * optional, since this value is calculated only, therefore it may not be present on i.e. initial runs
     */
    positivityRate?: number;

    // /**
    //  * category multipliers, normalized values between 0 and 1
    //  */
    // multipliers: { [K in string]: number };

    corrections: { [K in string]: number };

    /**
     * are this instance's value preceded by a smooth transition
     */
    blendable: boolean;

}
import { IModificationValues } from './IModificationValues';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesDiscovery extends IModificationValues {

    /**
     * should the category sliders be bound to the overall value
     */
    // bindToOverall: boolean;

    /**
     * expected total discovery
     */
    // overall: number;

    testRate: number;

    /**
     * category multipliers, normalized values between 0 and 1
     */
    multipliers: { [K in string]: number };

    /**
     * are this instance's value preceded by a smooth transition
     */
    blendable: boolean;

}
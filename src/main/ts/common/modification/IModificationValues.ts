import { MODIFICATION____KEY } from '../../model/ModelConstants';
/**
 * base definition for parameters used to initialize a modification instance
 *
 * @author h.fleischer
 * @since 23.04.2021
 *
 */
export interface IModificationValues {

    /**
     * get a unique id for this strain
     */
    id: string;

    /**
     * get the type-key of this instance
     */
    key: MODIFICATION____KEY;

    /**
     * the start instant of this instance (end instant will either be the next modification's start instant, or the timeline end instant)
     */
    instant: number;

    /**
     * get a name for this instance
     */
    name: string;

    /**
     * is this instance deletable
     */
    deletable: boolean;

    draggable: boolean;

    /**
     * are this instance's value preceded by a smooth transition
     */
    blendable: boolean;

}
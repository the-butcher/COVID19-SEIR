import { MODIFICATION__FETCH, MODIFICATION____KEY } from './../../model/ModelConstants';
import { IModification } from './IModification';
import { IModificationValues } from './IModificationValues';

/**
 * definition for types that can provide a specific state for a set of modifications of a given type
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export interface IModificationResolver<V extends IModificationValues, M extends IModification<V>> {

    getKey(): MODIFICATION____KEY;

    /**
     * for the given instant, and set of modifications, get a relevant modification
     * this can be a default instance, one of the modifications passed in, or an interpolated instance
     *
     * @param instant
     * @param modifications
     */
    getModification(instant: number, fetchType: MODIFICATION__FETCH): M;

    // /**
    //  * get the current modification data held by this instance
    //  */
    // getModificationData(): IModificationData[];

}
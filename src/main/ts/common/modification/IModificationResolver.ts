import { IModificationData } from '../../client/chart/ChartAgeGroup';
import { MODIFICATION____KEY, MODIFICATION__FETCH } from './../../model/ModelConstants';
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

    /**
     * get the current modification data held by this instance
     */
    getModificationData(): IModificationData[];

    /**
     * get a value displayable in the modification minichart
     * @param instant
     */
    getValue(instant: number): number;

    /**
     * get the lower limit of the modification chart as suitable for this instance
     */
    getMinValue(): number

    /**
     * get the upper limit of the modification chart as suitable for this instance
     */
    getMaxValue(): number

    /**
     * get a meaningful series title for the information provided by this resolver
     */
    getTitle(): string;

}
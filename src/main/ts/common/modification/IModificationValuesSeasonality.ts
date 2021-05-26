import { IModificationValues as IModificationValues } from './IModificationValues';

/**
 * definition for types that describe a seasonality value
 *
 * @author h.fleischer
 * @since 17.05.2021
 */
export interface IModificationValuesSeasonality extends IModificationValues {

    /**
     * get the amount of r0 reduction
     */
    seasonality: number;

}
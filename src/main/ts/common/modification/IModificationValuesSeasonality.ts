import { IModificationValues as IModificationValues } from './IModificationValues';

/**
 *
 * @author h.fleischer
 * @since 17.05.2021
 */
export interface IModificationValuesSeasonality extends IModificationValues {

    /**
     * get the amount of r0 reduction
     */
    amount: number;

}
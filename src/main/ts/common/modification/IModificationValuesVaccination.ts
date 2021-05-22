import { IModificationValues as IModificationValues } from './IModificationValues';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesVaccination extends IModificationValues {

    /**
     * get the number of doses configured in this instance
     */
    doses: number;

}
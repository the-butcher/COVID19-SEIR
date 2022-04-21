import { IVaccinationConfig } from '../demographics/IVaccinationConfig';
import { IModificationValues as IModificationValues } from './IModificationValues';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesVaccination extends IModificationValues {

    /**
     * absolute vaccination numbers at the instant of this modification
     */
    vaccinations: { [K in string]: IVaccinationConfig }

}
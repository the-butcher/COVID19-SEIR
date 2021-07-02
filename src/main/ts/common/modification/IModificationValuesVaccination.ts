import { IModificationValues as IModificationValues } from './IModificationValues';
import { IVaccinationConfig } from '../demographics/IVaccinationConfig';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesVaccination extends IModificationValues {

    /**
     * vaccination curves by age-groups
     */
    vaccinationCurves: { [K in string] : IVaccinationConfig };

}
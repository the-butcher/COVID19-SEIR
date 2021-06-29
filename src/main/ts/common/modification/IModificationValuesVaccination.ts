import { IModificationValues as IModificationValues } from './IModificationValues';
import { IVaccinationCurve } from './IVaccinationCurve';

/**
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesVaccination extends IModificationValues {

    /**
     * vaccination curves by age-groups
     */
    vaccinationCurves: { [K in string] : IVaccinationCurve };

}
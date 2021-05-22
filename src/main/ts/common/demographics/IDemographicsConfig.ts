import { IAgeGroupConfig } from './IAgeGroupConfig';
import { IContactMatrixConfig } from './IContactMatrixConfig';

/**
 * definition for types that hold configuration for demographics
 * -- age groups
 * -- contact matrices
 *
 * @author h.fleischer
 * @since 21.05.2021
 */
export interface IDemographicsConfig {

    groups: IAgeGroupConfig[];

    matrices: IContactMatrixConfig[];

}
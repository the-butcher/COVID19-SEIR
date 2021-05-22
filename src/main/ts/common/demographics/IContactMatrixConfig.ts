import { IAgeGroupConfig } from './IAgeGroupConfig';

/**
 * definition for types that hold configuration for a contact-matrix
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IContactMatrixConfig {

    /**
     * name of this contact-matrix
     */
    name: string;

    /**
     * data of this contact matrix
     */
    data: number[][];

    /**
     * age-group to reference into the contact matrices
     */
    ageGroups: IAgeGroupConfig[];

}
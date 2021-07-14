import { IModificationValues } from './IModificationValues';


/**
 * definition for parameters defining a live IStrain instance
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesStrain extends IModificationValues {

    /**
     * get the base reproduction number of this strain
     */
    r0: number;

    /**
     * is this the primary strain in the model;
     */
    primary: boolean;

    /**
     * get the serial interval of this strain
     */
    serialInterval: number;

    /**
     * get the interval scale of this strain (basically a "stretch")
     */
    intervalScale: number;

    /**
     * the initial incidence of this strain
     */
    dstIncidence: number;

    preIncidence?: number;

    /**
     * calculated incidences at preload time
     */
    preIncidences?: number[];

    /**
     * target reproduction rates at preload time
     */
    preGrowthRate?: number[];

    transmissionRisk?: number

}
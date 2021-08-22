import { IModificationValues } from './IModificationValues';

/**
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesSettings extends IModificationValues {

    /**
     * initial ratio of undiscovered cases with regard to total cases
     */
    undetected: number;

    /**
     * a ratio of population that will quarantine after a positive test, thus reducing further spread
     */
    quarantine: number;

    /**
     * unused
     */
    dead: number;

    /**
     * time to reexposable (months)
     */
    reexposure: number;

}
import { IModificationValues } from './IModificationValues';

/**
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesSettings extends IModificationValues {

    recoveredD: number; // initial number of recovered individuals
    recoveredU: number; // initial number of recovered individuals
    vaccinated: number; // initial number of vaccinated individuals (1st dose)
    quarantine: number; // percentage of contact reduction after a having tested positive
    dead: number; // initial number of dead

}
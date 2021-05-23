import { IValueHolder } from '../IValueHolder';
import { IRational } from '../rational/IRational';
import { ECompartmentType } from './ECompartmentType';
import { IConnectable } from './IConnectable';

/**
 * definition for types that describe a compartment in the model
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export interface ICompartment extends IConnectable, IValueHolder {

    /**
     * get a unique id for this compartment
     */
    getId(): string;

    /**
     * get the type of this compartment
     */
    getCompartmentType(): ECompartmentType;

    /**
     * get the index of a specific age-group associated with the compartment
     * index is used for faster group lookup rather than name
     */
    getAgeGroupIndex(): number;

    /**
     * get a rate at which this compartment passes on values
     */
    getContinuationRatio(): IRational;

    /**
     * get a strain id associated with this compartment, if any
     */
    getStrainId(): string;

}
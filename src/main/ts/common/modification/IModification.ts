import { MODIFICATION_NATURE, MODIFICATION____KEY } from '../../model/ModelConstants';
import { IModificationValues } from './IModificationValues';

/**
 * definition for types that describe a modification to the standard flow of the model
 *
 * @author h.fleischer
 * @since 24.05.2021
 */
export interface IModification<P extends IModificationValues> {

    /**
     * get a unique id for this instance
     */
    getId(): string;

    /**
     * get the key (type) of this modification (CONTACT, STRAIN, ...)
     */
    getKey(): MODIFICATION____KEY;

    /**
     * get the nature of this instance (INSTANT, RANGE, ...)
     */
    getNature(): MODIFICATION_NATURE;

    /**
     * get a human readable name of this instance
     */
    getName(): string;

    /**
     * check if this instance applies to the given instant (min-inclusive, max-exclusive)
     * @param instant
     */
    appliesToInstant(instant: number): boolean;

    /**
     * get the instant at which this modification becomes effective
     */
    getInstantA(): number;

    /**
     * get the instance at which this modification ends being effective
     */
    getInstantB(): number;

    /**
     * update the effective range of this instance
     * @param instantA
     * @param instantB
     */
    setInstants(instantA: number, instantB: number): void;

    /**
     * check if this instance can be deleted through the modification slider
     */
    isDeletable(): boolean;

    /**
     * check if this instance can be dragged along the modification slider
     */
    isDraggable(): boolean;

    /**
     * accept a (partial) update to this instance's modification-values
     * @param update
     */
    acceptUpdate(update: Partial<P>): void;

    /**
     * get an instance of IModification params suitable to describe this modification instance, i.e. for persistance
     */
    getModificationValues(): P;

}
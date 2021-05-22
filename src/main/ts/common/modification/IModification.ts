import { MODIFICATION_NATURE, MODIFICATION____KEY } from '../../model/ModelConstants';
import { IModificationValues } from './IModificationValues';

export interface IModification<P extends IModificationValues> {

    getId(): string;

    getKey(): MODIFICATION____KEY;

    getNature(): MODIFICATION_NATURE;

    getName(): string;

    /**
     * check if this instance applies to the given instant (min-inclusive, max-exclusive)
     * @param instant
     */
    appliesToInstant(instant: number): boolean;

    getInstantA(): number;

    getInstantB(): number;

    setInstants(instantA: number, instantB: number): void;

    isDeletable(): boolean;

    isDraggable(): boolean;

    acceptUpdate(update: Partial<P>): void;

    /**
     * get an instance of IModification params suitable to describe this modification instance, i.e. for persistance
     */
    getModificationValues(): P;

    /**
     * get a value displayable in the modification chart
     */
    getModificationValue(): number;

}
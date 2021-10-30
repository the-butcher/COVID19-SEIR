import { MODIFICATION_NATURE, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ModelInstants } from './../../model/ModelInstants';
import { IModification } from './IModification';
import { IModificationValues } from './IModificationValues';

/**
 * base class for modifications. this type adds some logic, getters and setters to instances of IModificationValues
 *
 * @author h.fleischer
 * @since 24.05.2021
 */
export abstract class AModification<P extends IModificationValues> implements IModification<P> {

    protected modificationValues: P;

    private readonly nature: MODIFICATION_NATURE;
    private instantB: number;

    constructor(nature: MODIFICATION_NATURE, modificationValues: P) {
        this.nature = nature;
        this.modificationValues = modificationValues;
    }

    appliesToInstant(instant: number): boolean {
        return instant >= this.modificationValues.instant && (this.instantB === ModelInstants.getInstance().getMaxInstant() || instant < this.instantB);
    }

    getId(): string {
        return this.modificationValues.id;
    }

    getName(): string {
        return this.modificationValues.name;
    }

    getKey(): MODIFICATION____KEY {
        return this.modificationValues.key;
    }

    getNature(): MODIFICATION_NATURE {
        return this.nature;
    }

    getInstantA(): number {
        return this.modificationValues.instant;
    }

    getInstantB(): number {
        return this.instantB;
    }

    setInstants(instantA: number, instantB: number): void {
        this.modificationValues.instant = instantA;
        this.instantB = instantB;
    }

    getDuration(): number {
        return this.instantB - this.modificationValues.instant;
    }

    isDeletable(): boolean {
        return this.modificationValues.deletable;
    }

    isDraggable(): boolean {
        return this.modificationValues.draggable;
    }

    acceptUpdate(update: Partial<P>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getModificationValues(): P {
        return this.modificationValues;
    }

}
import { IModificationValues } from './IModificationValues';
import { ModelConstants, MODIFICATION_NATURE, MODIFICATION____KEY } from '../../model/ModelConstants';
import { IModification } from './IModification';

export abstract class AModification<P extends IModificationValues> implements IModification<P> {

    protected modificationValues: P;

    private readonly key: MODIFICATION____KEY;
    private readonly nature: MODIFICATION_NATURE;
    private readonly deletable: boolean;
    private instantB: number;

    constructor(key: MODIFICATION____KEY, nature: MODIFICATION_NATURE, modificationValues: P) {
        this.key = key;
        this.nature = nature;
        this.modificationValues = modificationValues;
        this.deletable = ModelConstants.MODIFICATION_PARAMS[key].deletable;
    }

    appliesToInstant(instant: number): boolean {
        return instant >= this.modificationValues.instant && instant < this.instantB;
    }

    getId(): string {
        return this.modificationValues.id;
    }

    getName(): string {
        return this.modificationValues.name;
    }

    getKey(): MODIFICATION____KEY {
        return this.key;
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
        return this.deletable;
    }

    abstract acceptUpdate(update: Partial<P>): void

    abstract getModificationValue(): number;

    getModificationValues(): P {
        return this.modificationValues;
    }

}
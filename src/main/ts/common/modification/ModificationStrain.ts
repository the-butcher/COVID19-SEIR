import { IModificationValuesStrain } from './IModificationValuesStrain';
import { AModification } from './AModification';

export class ModificationStrain extends AModification<IModificationValuesStrain> {

    constructor(modificationValues: IModificationValuesStrain) {
        super('STRAIN', 'INSTANT', modificationValues);
    }

    acceptUpdate(update: Partial<IModificationValuesStrain>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getModificationValue(): number {
        return -1; // TODO maybe find a way to show r(t)
    }

}
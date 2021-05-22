import { IModificationValuesSeasonality } from './IModificationValuesSeasonality';
import { AModification } from './AModification';

/**
 * implementation of IModification for a specific amount of r0 reduction during warmer periods
 *
 * @author h.fleischer
 * @since 17.05.2021
 */
export class ModificationSeasonality extends AModification<IModificationValuesSeasonality> {

    constructor(modificationParams: IModificationValuesSeasonality) {
        super('SEASONALITY', 'INSTANT', modificationParams);
    }

    acceptUpdate(update: Partial<IModificationValuesSeasonality>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getAmount(): number {
        return this.modificationValues.amount;
    }

    getModificationValue(): number {
        return this.getAmount();
    }

}
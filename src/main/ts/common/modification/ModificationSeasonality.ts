import { IModificationValuesSeasonality } from './IModificationValuesSeasonality';
import { AModification } from './AModification';
import { ObjectUtil } from '../../util/ObjectUtil';

/**
 * implementation of IModification for a specific amount of r0 reduction during warmer periods
 *
 * @author h.fleischer
 * @since 17.05.2021
 */
export class ModificationSeasonality extends AModification<IModificationValuesSeasonality> {

    constructor(modificationParams: IModificationValuesSeasonality) {
        super('INSTANT', modificationParams);
        if (ObjectUtil.isEmpty(this.modificationValues.seasonalities)) {
            this.modificationValues.seasonalities = {};
        }
    }

    getSeasonality(category: string): number {
        return this.modificationValues.seasonalities[category];
    }

    acceptUpdate(update: Partial<IModificationValuesSeasonality>): void {
        update.seasonalities = { ...this.modificationValues.seasonalities, ...update.seasonalities };
        super.acceptUpdate(update);
    }

    getCategoryValue(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.seasonalities[contactCategoryName])) {
            this.modificationValues.seasonalities[contactCategoryName] = 0.9;
        }
        return this.modificationValues.seasonalities[contactCategoryName];
    }


}
import { ObjectUtil } from '../../util/ObjectUtil';
import { AModification } from './AModification';
import { IContactColumns } from './IContactColumns';
import { IModificationValuesDiscovery } from './IModificationValueDiscovery';

/**
 * implementation of IModification for testing / discovery
 * multiple testing filters for different categories are kept as instance variable
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationDiscovery extends AModification<IModificationValuesDiscovery> implements IContactColumns {

    constructor(valuesTesting: IModificationValuesDiscovery) {
        super('RANGE', valuesTesting);
    }

    getColumnValue(ageGroupIndex: number): number {
        return 0;
    }

    getMaxColumnValue(): number {
        return 0;
    }

    getColumnSum(): number {
        return 0;
    }

    getMaxColumnSum(): number {
        return 0;
    }

    acceptUpdate(update: Partial<IModificationValuesDiscovery>): void {
        super.acceptUpdate(update);
    }

    getOverall(): number {
        return this.modificationValues.overall;
    }

    isBoundToTotal(): boolean {
        return this.modificationValues.bindToOverall;
    }

    getCategoryValue(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 0.1;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
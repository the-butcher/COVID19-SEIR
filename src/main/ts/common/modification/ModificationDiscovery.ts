import { BaseData } from '../../model/basedata/BaseData';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { Demographics } from '../demographics/Demographics';
import { AModification } from './AModification';
import { IContactColumns } from './IContactColumns';
import { IModificationValuesDiscovery } from './IModificationValuesDiscovery';

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
        update.multipliers = { ...this.modificationValues.multipliers, ...update.multipliers };
        super.acceptUpdate(update);
    }

    getPositivityRate(): number {

        let positivityRate = BaseData.getInstance().findBaseDataItem(this.getInstantA())?.getAveragePositivity();

        if (positivityRate) {
            this.acceptUpdate({
                positivityRate
            });
            return positivityRate;
        }

        if (this.modificationValues.positivityRate) {
            return this.modificationValues.positivityRate;
        }

        positivityRate = BaseData.getInstance().findBaseDataItem(BaseData.getInstance().getLastValidInstant() - TimeUtil.MILLISECONDS_PER____DAY * 4).getAveragePositivity();
        this.acceptUpdate({
            positivityRate
        });
        return positivityRate;

    }

    getTestRate(): number {
        const dataItem = BaseData.getInstance().findBaseDataItem(this.getInstantA());
        if (dataItem) {
            const averagePosititivity = dataItem.getAveragePositivity();
            const averageTests = dataItem.getAverageTests();
            if (averagePosititivity && averageTests) {
                return averageTests / Demographics.getInstance().getAbsTotal();
            }
        } else {
            Math.random();
        }
        return this.modificationValues.testRate || 0.04;
    }

    isBlendable(): boolean {
        return this.modificationValues.blendable;
    }

    getCategoryValue(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 0.1;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
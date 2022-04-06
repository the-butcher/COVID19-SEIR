import { BaseData } from '../../model/basedata/BaseData';
import { ObjectUtil } from '../../util/ObjectUtil';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
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
        update.multipliers = { ...this.modificationValues.multipliers, ...update.multipliers };
        super.acceptUpdate(update);
    }

    getOverall(): number {

        const dataItem = BaseData.getInstance().findBaseDataItem(this.getInstantA());
        const averagePosititivity = dataItem.getAveragePositivity();
        const discoveryRate = StrainUtil.calculateDiscoveryRate(averagePosititivity);
        return discoveryRate;

        // console.log(this.modificationValues.id, discoveryRate, this.modificationValues.overall);
        // this.modificationValues.overall = discoveryRate;
        // return discoveryRate;

        // return this.modificationValues.overall;

    }

    isBoundToTotal(): boolean {
        return this.modificationValues.bindToOverall;
    }

    isBlendable(): boolean {
        return this.modificationValues.blendable;
    }

    getCategoryValue(contactCategoryName: string): number {

        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 0.1;
        }

        const mWork = 0.5;

        this.modificationValues.multipliers['school'] = 0.75;
        this.modificationValues.multipliers['nursing'] = 0.60;
        this.modificationValues.multipliers['family'] = 0.10;
        this.modificationValues.multipliers['work'] = mWork;
        this.modificationValues.multipliers['other'] = 0.20;

        const minDecayInstant = 1646438400000; // Date and time (GMT): Saturday, March 5, 2022 0:00:00; // Date and time (GMT): Friday, February 25, 2022 0:00:00
        const maxDecayInstant = minDecayInstant + TimeUtil.MILLISECONDS_PER___WEEK * 2; // Date and time (GMT): Friday, March 4, 2022 0:00:00
        if (this.modificationValues.instant > minDecayInstant) {
            if (this.modificationValues.instant <= maxDecayInstant) {
                const fraction = (this.modificationValues.instant - minDecayInstant) / (maxDecayInstant - minDecayInstant);
                this.modificationValues.multipliers['work'] = mWork - fraction * (mWork - 0.05);
            } else {
                this.modificationValues.multipliers['work'] = 0.05;
            }
        }

        return this.modificationValues.multipliers[contactCategoryName];

    }

}
import { BaseData } from '../../model/basedata/BaseData';
import { ObjectUtil } from '../../util/ObjectUtil';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { Demographics } from '../demographics/Demographics';
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
        const testsPer100000 = dataItem.getAverageTests() * 100000 / Demographics.getInstance().getAbsTotal();
        const discoveryRate = StrainUtil.calculateDiscoveryRate(this.getInstantA(), averagePosititivity, testsPer100000);

        // console.log(TimeUtil.formatCategoryDateFull(this.getInstantA()), testsPer100000);


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

        // this.modificationValues.multipliers['school'] = 0.70;
        // this.modificationValues.multipliers['nursing'] = 0.60;
        // this.modificationValues.multipliers['family'] = 0.15;
        // this.modificationValues.multipliers['work'] = 0.50;
        // this.modificationValues.multipliers['other'] = 0.25;

        // const minDecayInstant = TimeUtil.parseCategoryDateFull('15.03.2022'); // 1646438400000; // Date and time (GMT): Saturday, March 5, 2022 0:00:00; // Date and time (GMT): Friday, February 25, 2022 0:00:00
        // const maxDecayInstant = minDecayInstant + TimeUtil.MILLISECONDS_PER___WEEK * 2;
        // if (this.modificationValues.instant > minDecayInstant) {
        //     if (this.modificationValues.instant <= maxDecayInstant) {
        //         const fraction = (this.modificationValues.instant - minDecayInstant) / (maxDecayInstant - minDecayInstant);
        //         this.modificationValues.multipliers['school'] = 0.7 - fraction * 0.30;
        //         // this.modificationValues.multipliers['work'] = mWork - fraction * 0.30;
        //     } else {
        //         this.modificationValues.multipliers['school'] = 0.40;
        //         // this.modificationValues.multipliers['work'] = 0.20;
        //     }
        // }

        return this.modificationValues.multipliers[contactCategoryName];

    }

}
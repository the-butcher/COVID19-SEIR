import { BaseData } from '../../model/basedata/BaseData';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { AgeGroup } from '../demographics/AgeGroup';
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

    private readonly ageGroups: AgeGroup[];

    constructor(valuesTesting: IModificationValuesDiscovery) {
        super('RANGE', valuesTesting);
        this.ageGroups = [...Demographics.getInstance().getAgeGroups()];
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

    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
    }

    acceptUpdate(update: Partial<IModificationValuesDiscovery>): void {
        // update.multipliers = { ...this.modificationValues.multipliers, ...update.multipliers };
        update.corrections = { ...this.modificationValues.corrections, ...update.corrections };
        super.acceptUpdate(update);
    }

    getCorrectionValue(ageGroupIndex: number): number {
        let correctionValue: number;
        if (this.modificationValues.corrections) {
            correctionValue = this.modificationValues.corrections[this.ageGroups[ageGroupIndex].getName()];
        }
        return correctionValue ? correctionValue : 1;
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
            // const averagePosititivity = dataItem.getAveragePositivity();
            const averageTests = dataItem.getAverageTests();
            if (/* averagePosititivity && */ averageTests) {
                const testRate = averageTests / Demographics.getInstance().getAbsTotal();
                // console.log(TimeUtil.formatCategoryDateFull(this.getInstantA()), averageTests.toFixed(2), Demographics.getInstance().getAbsTotal(), testRate.toFixed(4));
                this.acceptUpdate({
                    testRate
                });
                return testRate;
            }
        } else {
            Math.random();
        }
        return this.modificationValues.testRate || 0.04;
    }

    // getFactorWeight(): number {
    //     return this.modificationValues.factorWeight || 0.7;
    // }

    isBlendable(): boolean {
        return this.modificationValues.blendable;
    }

    // getCategoryValue(contactCategoryName: string): number {
    //     if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
    //         this.modificationValues.multipliers[contactCategoryName] = 0.1;
    //     }
    //     return this.modificationValues.multipliers[contactCategoryName];
    // }

}
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

    // private readonly absTotal: number;
    // private readonly ageGroups: AgeGroup[];
    // private readonly contactCategories: ContactCategory[];
    // private readonly ageGroupTotalsByIndexContact: number[];
    // private readonly testingValsByIndexContact: number[];

    // private maxColumnValue: number;
    // private columnSum: number;
    // private maxColumnSum: number;

    constructor(valuesTesting: IModificationValuesDiscovery) {

        super('RANGE', valuesTesting);

        // this.maxColumnValue = -1;
        // this.columnSum = -1;
        // this.maxColumnSum = -1;

        // this.ageGroups = [...Demographics.getInstance().getAgeGroups()];
        // this.contactCategories = [...Demographics.getInstance().getCategories()];
        // this.ageGroupTotalsByIndexContact = [];
        // this.testingValsByIndexContact = [];

        // this.absTotal = Demographics.getInstance().getAbsTotal();

        // this.ageGroups.push(...Demographics.getInstance().getAgeGroups());
        // this.contactCategories.push(...Demographics.getInstance().getContactCategories());

        // build an initial set of contact-sums for later normalization
        // for (let ageGroupIndex = 0; ageGroupIndex < this.ageGroups.length; ageGroupIndex++) {
        //     let ageGroupTotal = 0;
        //     this.contactCategories.forEach(contactCategory => {
        //         ageGroupTotal += contactCategory.getAgeGroupTotal(ageGroupIndex);
        //     });
        //     this.ageGroupTotalsByIndexContact[ageGroupIndex] = ageGroupTotal;
        // }
        // this.rebuildContactVals();

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
        // this.rebuildContactVals();
    }

    getCategoryValue(contactCategoryName: string): number {
        // return this.getContactCategoryMultiplier(contactCategoryName);
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 0.1;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

    // getColumnValue(ageGroupIndex: number): number {
    //     return this.testingValsByIndexContact[ageGroupIndex];
    // }

    // getMaxColumnValue(): number {
    //     if (this.maxColumnValue < 0) {
    //         this.maxColumnValue = ContactCellsUtil.findMaxColumnValue(this);
    //     }
    //     return this.maxColumnValue;
    // }

    // getColumnSum(): number {
    //     if (this.columnSum < 0) {
    //         this.columnSum = ContactCellsUtil.findMatrixValue(this);
    //     }
    //     return this.columnSum;
    // }

    // getMaxColumnSum(): number {
    //     return this.maxColumnSum;
    // }

    // private rebuildContactVals(): void {
    //     this.maxColumnSum = 0;
    //     for (let ageGroupIndex = 0; ageGroupIndex < this.ageGroups.length; ageGroupIndex++) {
    //         let contactVal = 0;
    //         this.contactCategories.forEach(contactCategory => {
    //             const categoryContact = contactCategory.getAgeGroupTotal(ageGroupIndex) / this.ageGroupTotalsByIndexContact[ageGroupIndex];
    //             contactVal += this.getMultiplier(contactCategory.getName()) * categoryContact;
    //             this.maxColumnSum += categoryContact;
    //         });
    //         this.testingValsByIndexContact[ageGroupIndex] = Math.min(1, contactVal);
    //     }
    // }

}
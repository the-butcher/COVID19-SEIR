import { ObjectUtil } from '../../util/ObjectUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from '../demographics/Demographics';
import { AModification } from './AModification';
import { IContactColumns } from './IContactColumns';
import { IModificationValuesTesting } from './IModificationValuesTesting';

/**
 * implementation of IModification for testing / discovery
 * multiple testing filters for different categories are kept as instance variable
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationTesting extends AModification<IModificationValuesTesting> implements IContactColumns {

    private readonly absTotal: number;
    private readonly ageGroups: AgeGroup[];
    private readonly contactCategories: ContactCategory[];
    private readonly ageGroupTotalsByIndexContact: number[];
    private readonly testingValsByIndexContact: number[];

    constructor(valuesTesting: IModificationValuesTesting) {

        super('RANGE', valuesTesting);

        this.ageGroups = [];
        this.contactCategories = [];
        this.ageGroupTotalsByIndexContact = [];
        this.testingValsByIndexContact = [];

        this.absTotal = Demographics.getInstance().getAbsTotal();

        this.ageGroups.push(...Demographics.getInstance().getAgeGroups());
        this.contactCategories.push(...Demographics.getInstance().getContactCategories());

        // build an initial set of contact-sums for later normalization
        for (let ageGroupIndex = 0; ageGroupIndex < this.ageGroups.length; ageGroupIndex++) {
            let ageGroupTotal = 0;
            this.contactCategories.forEach(contactCategory => {
                ageGroupTotal += contactCategory.getAgeGroupTotal(ageGroupIndex);
            });
            this.ageGroupTotalsByIndexContact[ageGroupIndex] = ageGroupTotal;
        }
        this.rebuildContactVals();

    }

    acceptUpdate(update: Partial<IModificationValuesTesting>): void {
        this.modificationValues = {...this.modificationValues, ...update};
        this.rebuildContactVals();
    }

    getMultiplier(contactCategoryName: string): number {
        return this.getContactCategoryMultiplier(contactCategoryName);
    }

    getColumnValue(ageGroupIndex: number): number {
        return this.testingValsByIndexContact[ageGroupIndex];
    }

    getValueSum(): number {
        let totalTestingValue = 0;
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            totalTestingValue += this.getColumnValue(indexContact) * this.ageGroups[indexContact].getAbsValue();
        }
        return totalTestingValue / this.absTotal;
    }

    private rebuildContactVals(): void {
        for (let ageGroupIndex = 0; ageGroupIndex < this.ageGroups.length; ageGroupIndex++) {
            let contactVal = 0;
            this.contactCategories.forEach(contactCategory => {
                contactVal += this.getMultiplier(contactCategory.getName()) * contactCategory.getAgeGroupTotal(ageGroupIndex) /  this.ageGroupTotalsByIndexContact[ageGroupIndex];
            });
            this.testingValsByIndexContact[ageGroupIndex] = Math.min(1, contactVal);
        }
    }

    private getContactCategoryMultiplier(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 0.0;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
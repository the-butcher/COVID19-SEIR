import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from '../demographics/Demographics';
import { IModificationValuesTesting } from './IModificationValuesTesting';
import { ObjectUtil } from '../../util/ObjectUtil';
import { AModification } from './AModification';

/**
 * implementation of IModification for testing / discovery
 * multiple testing filters for different categories are kept as instance variable
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationTesting extends AModification<IModificationValuesTesting> {

    private readonly groups: AgeGroup[];
    private readonly contactCategories: ContactCategory[];
    private readonly ageGroupTotalsByIndexContact: number[];
    private readonly testingValsByIndexContact: number[];

    constructor(testingParams: IModificationValuesTesting) {

        super('RANGE', testingParams);

        this.groups = [];
        this.contactCategories = [];
        this.ageGroupTotalsByIndexContact = [];
        this.testingValsByIndexContact = [];

        this.groups.push(...Demographics.getInstance().getAgeGroups());
        this.contactCategories.push(...Demographics.getInstance().getContactCategories());

        // build an initial set of contact-sums for later normalization
        for (let ageGroupIndex = 0; ageGroupIndex < this.groups.length; ageGroupIndex++) {
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

    getTestingRatio(ageGroupIndex: number): number {
        return this.testingValsByIndexContact[ageGroupIndex];
    }

    private rebuildContactVals(): void {
        for (let ageGroupIndex = 0; ageGroupIndex < this.groups.length; ageGroupIndex++) {
            let contactVal = 0;
            this.contactCategories.forEach(contactCategory => {
                contactVal += this.getMultiplier(contactCategory.getName()) * contactCategory.getAgeGroupTotal(ageGroupIndex) /  this.ageGroupTotalsByIndexContact[ageGroupIndex];
            });
            this.testingValsByIndexContact[ageGroupIndex] = Math.min(1, contactVal);
        }
    }

    getModificationValue(): number {
        return -1; // TODO build a percentage like in contact matrix
    }

    private getContactCategoryMultiplier(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 0.0;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
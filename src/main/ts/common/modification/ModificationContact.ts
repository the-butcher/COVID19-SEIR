import { ObjectUtil } from '../../util/ObjectUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from '../demographics/Demographics';
import { AModification } from './AModification';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesContact } from './IModificationValuesContact';

/**
 * implementation of IModification for age-group contact matrix
 * multiple testing filters for different categories are kept as instance variable
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationContact extends AModification<IModificationValuesContact> implements IContactMatrix {

    private readonly ageGroups: AgeGroup[];
    private readonly contactCategories: ContactCategory[];
    private readonly maxCellTotal: number;
    private readonly maxColTotal: number;

    constructor(modificationParams: IModificationValuesContact) {

        super('RANGE', modificationParams);

        this.ageGroups = [];
        this.contactCategories = [];

        const demographics = Demographics.getInstance();
        this.ageGroups.push(...demographics.getAgeGroups());
        this.contactCategories.push(...demographics.getContactCategories());
        this.maxCellTotal = demographics.getMaxCellTotal();
        this.maxColTotal = demographics.getMaxColTotal();

    }

    getInstant(): number {
        return this.modificationValues.instant;
    }

    getMaxColTotal(): number {
        return this.maxColTotal;
    }

    getMaxCellTotal(): number {
        return this.maxCellTotal;
    }

    acceptUpdate(update: Partial<IModificationValuesContact>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getMultiplier(contactCategoryName: string): number {
        return this.getContactCategoryMultiplier(contactCategoryName);
    }

    getValue(indexContact: number, indexParticipant: number): number {
        let value = 0;
        this.contactCategories.forEach(contactCategory => {
            value += contactCategory.getData(indexContact, indexParticipant) * this.getMultiplier(contactCategory.getName());
        });
        return value;
    }

    getSummary(indexContact: number, indexParticipant: number): {[K: string]: string} {
        let summary: {[K: string]: string} = {};
        this.contactCategories.forEach(contactCategory => {
            summary[contactCategory.getName()] = (contactCategory.getData(indexContact, indexParticipant) * this.getMultiplier(contactCategory.getName())).toFixed(4);
        });
        return summary;
    }

    private getContactCategoryMultiplier(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 1.0;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
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

    constructor(modificationParams: IModificationValuesContact) {

        super('RANGE', modificationParams);

        this.ageGroups = [];
        this.contactCategories = [];

        this.ageGroups.push(...Demographics.getInstance().getAgeGroups());
        this.contactCategories.push(...Demographics.getInstance().getContactCategories());

    }

    acceptUpdate(update: Partial<IModificationValuesContact>): void {
        this.modificationValues = {...this.modificationValues, ...update};
    }

    getMultiplier(contactCategoryName: string): number {
        return this.getContactCategoryMultiplier(contactCategoryName);
    }

    getContacts(indexContact: number, indexParticipant: number): number {
        let value = 0;
        this.contactCategories.forEach(contactCategory => {
            value += contactCategory.getData(indexContact, indexParticipant) * this.getMultiplier(contactCategory.getName());
        });
        return value;
    }

    private getContactCategoryMultiplier(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 1.0;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
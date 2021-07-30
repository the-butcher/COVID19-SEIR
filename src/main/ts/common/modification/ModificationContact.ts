import { AXIS_DIRECTION } from './../../client/chart/ChartContactMatrix';
import { ContactMatrixSums } from './../../client/controls/ContactMatrixSums';
import { ObjectUtil } from '../../util/ObjectUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from '../demographics/Demographics';
import { AModification } from './AModification';
import { IContactCells } from './IContactCells';
import { IModificationValuesContact } from './IModificationValuesContact';

/**
 * implementation of IModification for age-group contact matrix
 * multiple testing filters for different categories are kept as instance variable
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationContact extends AModification<IModificationValuesContact> implements IContactCells {

    private readonly ageGroups: AgeGroup[];
    private readonly contactCategories: ContactCategory[];

    constructor(modificationParams: IModificationValuesContact) {

        super('RANGE', modificationParams);

        this.ageGroups = [];
        this.contactCategories = [];

        const demographics = Demographics.getInstance();
        this.ageGroups.push(...demographics.getAgeGroups());
        this.contactCategories.push(...demographics.getContactCategories());

    }

    logSummary(ageGroupName: string): void {
        const ageGroupContact = this.ageGroups.find(g => g.getName() === ageGroupName);
        console.log('ageGroupContact', ageGroupContact);
        const summary: { [K: string]: number} = {};
        let total = 0;
        this.contactCategories.forEach(contactCategory => {
            let sum = 0;
            this.ageGroups.forEach(ageGroupParticipant => {
                sum += contactCategory.getData(ageGroupContact.getIndex(), ageGroupParticipant.getIndex()) * this.getMultiplier(contactCategory.getName());
            });
            summary[contactCategory.getName()] = sum;
            total += sum;
        });
        summary['total'] = total;
        console.log(summary);
    }

    getInstant(): number {
        return this.modificationValues.instant;
    }

    acceptUpdate(update: Partial<IModificationValuesContact>): void {
        this.modificationValues = {...this.modificationValues, ...update};
        console.log('this.modificationValues', this.modificationValues);
    }

    getMultiplier(contactCategoryName: string): number {
        return this.getContactCategoryMultiplier(contactCategoryName);
    }

    getCellValue(indexContact: number, indexParticipant: number): number {
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
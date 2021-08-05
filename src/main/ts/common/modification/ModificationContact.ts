import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { ObjectUtil } from '../../util/ObjectUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from './../demographics/Demographics';
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

    private matrixValue: number;
    private columnValues: number[];

    constructor(modificationParams: IModificationValuesContact) {

        super('RANGE', modificationParams);

        this.ageGroups = [];
        this.contactCategories = [];

        const demographics = Demographics.getInstance();
        this.ageGroups.push(...demographics.getAgeGroups());
        this.contactCategories.push(...demographics.getContactCategories());

        this.matrixValue = -1;
        this.columnValues = [];
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }

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

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    getCellSum(): number {
        return this.getMatrixSum();
    }

    getColumnSum(): number {
        return this.getMatrixSum();
    }

    getMatrixSum(): number {
        if (this.matrixValue < 0) {
            this.matrixValue = ContactCellsUtil.findMatrixValue(this);
        }
        return this.matrixValue;
    }

    getMaxCellValue(): number {
        return Demographics.getInstance().getMaxCellValue();
    }

    getMaxColumnValue(): number {
        return Demographics.getInstance().getMaxColumnValue();
    }

    getMaxColumnSum(): number {
        return this.getMaxMatrixSum();
    }

    getMaxMatrixSum(): number {
        return Demographics.getInstance().getMatrixValue();
    }

    private getContactCategoryMultiplier(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 1.0;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

}
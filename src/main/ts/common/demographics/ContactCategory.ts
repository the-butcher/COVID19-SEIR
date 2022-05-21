import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { IContactCells } from '../modification/IContactCells';
import { IContactMatrixConfig } from './IContactMatrixConfig';

/**
 * this type refers to a single contact category (family|school|work|other)
 * for that category a contact matrix is held specifying all age-groups to age-group contact counts
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export class ContactCategory implements IContactCells {

    private readonly name: string;
    private readonly data: number[][];
    private maxCellValue: number;
    private columnValues: number[];
    private valueSum: number;

    constructor(contactCategoryParams: IContactMatrixConfig) {
        this.name = contactCategoryParams.name;
        this.columnValues = [];
        this.data = contactCategoryParams.data;
        this.resetValues();
    }

    resetValues(): void {
        this.valueSum = -1;
        this.maxCellValue = -1;
        // this.matrixValue = -1;
        this.columnValues = [];
        for (let indexContact = 0; indexContact < this.data.length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }
    }


    getName(): string {
        return this.name;
    }

    getCellValue(indexContact: number, indexParticipant: number) {
        return this.data[indexContact][indexParticipant];
    }

    getMaxCellValue(): number {
        if (this.maxCellValue < 0) {
            this.maxCellValue = ContactCellsUtil.findMaxCellValue(this);
        }
        return this.maxCellValue;
    }

    getCellSum(): number {
        if (this.valueSum < 0) {
            this.valueSum = ContactCellsUtil.findMatrixValue(this);
        }
        return this.valueSum;
    }

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    // logSummary(ageGroupName: string): void {
    //     throw new Error('Method not implemented.');
    // }

}
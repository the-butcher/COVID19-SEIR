import { AgeGroup } from '../../common/demographics/AgeGroup';
import { IContactMatrix } from '../../common/modification/IContactMatrix';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { Demographics } from './../../common/demographics/Demographics';
import { TimeUtil } from './../../util/TimeUtil';

/**
 * contact matrix showing effective exposure for a given instant
 *
 * @author h.fleischer
 * @since 07.06.2021
 */
export class ContactMatrixExposure implements IContactMatrix {

    private readonly ageGroups: AgeGroup[];
    private readonly instant: number;
    private readonly grpContacts: number[][];

    private maxCellValue: number;
    private maxColumnValue: number;
    private matrixValue: number;
    private columnValues: number[];

    constructor(instant: number) {

        const demographics = Demographics.getInstance();
        this.ageGroups = demographics.getAgeGroups();

        this.instant = instant;
        this.maxCellValue = -1;
        this.maxColumnValue = -1;
        this.matrixValue = -1;
        this.columnValues = [];
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }

        const dataItem = ChartAgeGroup.getInstance().findDataItemByInstant(instant);
        let nrmExpTotal = 0;
        if (dataItem) {
            this.grpContacts = [];
            for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
                this.grpContacts[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                    this.grpContacts[indexContact][indexParticipant] = ChartAgeGroup.getInstance().findDataItemByInstant(instant).exposure[indexContact][indexParticipant]; // * demographics.getAbsTotal() / this.ageGroups[indexContact].getAbsValue();
                    nrmExpTotal += this.grpContacts[indexContact][indexParticipant];
                }

            }
        }

        // console.log(TimeUtil.formatCategoryDate(this.instant), nrmExpTotal * demographics.getAbsTotal());

    }

    getMaxCellValue(): number {
        if (this.maxCellValue < 0) {
            this.maxCellValue = ContactCellsUtil.findMaxCellValue(this);
        }
        return this.maxCellValue;
    }

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    getMaxColumnValue(): number {
        if (this.maxColumnValue < 0) {
            this.maxColumnValue = ContactCellsUtil.findMaxColumnValue(this);
        }
        return this.maxColumnValue;
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

    getMaxColumnSum(): number {
        return this.getMatrixSum();
    }

    getMaxMatrixSum(): number {
        return this.getMatrixSum(); // TODO return max value of timeline
    }

    logSummary(ageGroupName: string): void {
        const ageGroupContact = this.ageGroups.find(g => g.getName() === ageGroupName);
        console.log('ageGroupContact', ageGroupContact);
        let nrmSum = 0;
        this.ageGroups.forEach(ageGroupParticipant => {
            nrmSum += this.getCellValue(ageGroupContact.getIndex(), ageGroupParticipant.getIndex());
        });
        console.log('nrmSum', ageGroupName, nrmSum);
    }

    getInstant(): number {
        return this.instant;
    }

    getCellValue(indexContact: number, indexParticipant: number): number {
        if (this.grpContacts) {
            return this.grpContacts[indexContact][indexParticipant];
        }
        return 0;
    }

}
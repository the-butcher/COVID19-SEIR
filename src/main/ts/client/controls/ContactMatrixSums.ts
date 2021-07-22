import { Demographics } from '../../common/demographics/Demographics';
import { IContactCells } from '../../common/modification/IContactCells';
import { IContactMatrix } from '../../common/modification/IContactMatrix';
import { AXIS_DIRECTION } from './../chart/ChartContactMatrix';

export class ContactMatrixSums implements IContactMatrix {

    private readonly instant: number;
    private readonly contactCells: IContactCells;
    private readonly columnSums: number[];
    private valueSum: number;
    private readonly axisDirection: AXIS_DIRECTION;
    private maxCellValue: number;
    private maxColumnValue: number;

    constructor(instant: number, contactCells: IContactCells, axisDirection: AXIS_DIRECTION) {
        this.instant = instant;
        this.contactCells = contactCells
        this.columnSums = [];
        this.axisDirection = axisDirection;
        this.rebuildValues();
    }

    getInstant(): number {
        return this.instant;
    }

    getCellValue(indexContact: number, indexParticipant: number): number {
        return this.contactCells.getCellValue(indexContact, indexParticipant);
    }

    getMaxColumnValue(): number {
        return this.maxColumnValue;
    }

    getMaxCellValue(): number {
        return this.maxCellValue;
    }

    getColumnValue(ageGroupIndex: number): number {
        return this.columnSums[ageGroupIndex];
    }

    getValueSum(): number {
        return this.valueSum;
    }

    private rebuildValues(): void {

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        this.valueSum = 0;
        this.maxCellValue = 0;
        this.maxColumnValue = 0;

        let cellValue: number;
        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            let columnValue = 0;
            for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                cellValue = this.contactCells.getCellValue(indexContact, indexParticipant) * ageGroups[indexContact].getAbsValue();
                columnValue += cellValue;
                this.maxCellValue = Math.max(this.maxCellValue, cellValue);
                this.valueSum += cellValue;
            }
            this.columnSums[indexContact] = columnValue;
            this.maxColumnValue = Math.max(this.maxColumnValue, columnValue);
        }

    }

}
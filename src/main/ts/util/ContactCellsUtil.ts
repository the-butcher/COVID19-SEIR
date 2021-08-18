import { IContactMatrix } from './../common/modification/IContactMatrix';
import { Demographics } from '../common/demographics/Demographics';
import { IContactCells } from './../common/modification/IContactCells';

export class ContactCellsUtil {

    private constructor() {
        // do nothing
    }

    static findMaxCellValue(contactCells: IContactCells): number {
        const ageGroups = Demographics.getInstance().getAgeGroups();
        let maxCellValue = 0;
        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                maxCellValue = Math.max(maxCellValue, contactCells.getCellValue(indexContact, indexParticipant));
            }
        }
        return maxCellValue;
    }

    static findColumnValue(ageGroupIndex: number, contactCells: IContactCells): number {
        const ageGroups = Demographics.getInstance().getAgeGroups();
        let columnValue = 0;
        for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
            columnValue += contactCells.getCellValue(ageGroupIndex, indexParticipant);
        }
        return columnValue;
    }

    static findMaxColumnValue(contactColumns: IContactMatrix): number {
        const ageGroups = Demographics.getInstance().getAgeGroups();
        let maxColumnValue = 0;
        for (let indexColumn = 0; indexColumn < ageGroups.length; indexColumn++) {
            maxColumnValue = Math.max(maxColumnValue, contactColumns.getColumnValue(indexColumn));
        }
        return maxColumnValue;
    }

    static findMatrixValue(contactCells: IContactCells): number {
        const ageGroups = Demographics.getInstance().getAgeGroups();
        let valueSum = 0;
        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                valueSum += contactCells.getCellValue(indexContact, indexParticipant);
            }
        }
        return valueSum;
    }

}
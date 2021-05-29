import { Demographics } from '../../common/demographics/Demographics';
import { IContactMatrix } from './../../common/modification/IContactMatrix';

export class ContactMatrixSums {

    private readonly contactMatrix: IContactMatrix;
    private readonly columnSums: number[];
    private matrixSum: number;

    constructor(contactMatrix: IContactMatrix) {
        this.contactMatrix = contactMatrix
        this.columnSums = [];
        this.rebuildValues();
    }

    rebuildValues(): void {

        const demographics = Demographics.getInstance();
        const ageGroups = demographics.getAgeGroups();

        this.matrixSum = 0;
        let contact: number;
        for (let indexContact = 0; indexContact < ageGroups.length; indexContact++) {
            let columnContactsCurr = 0;
            for (let indexParticipant = 0; indexParticipant < ageGroups.length; indexParticipant++) {
                contact = this.contactMatrix.getContacts(indexContact, indexParticipant) * ageGroups[indexContact].getAbsValue();
                columnContactsCurr += contact;
                this.matrixSum += contact;
            }
            this.columnSums[indexContact] = columnContactsCurr;
        }

    }

    getColumnSum(ageGroupIndex: number): number {
        return this.columnSums[ageGroupIndex];
    }

    getMatrixSum(): number {
        return this.matrixSum;
    }

}
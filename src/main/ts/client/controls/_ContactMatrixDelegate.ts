// import { IContactCells } from '../../common/modification/IContactCells';
// import { IContactMatrix } from '../../common/modification/IContactMatrix';
// import { ContactMatrixSums } from './ContactMatrixSums';

// /**
//  * helper type for display in time-modification chart, where the full time range is the scope for max-cell-total and max-col-total
//  *
//  * @author h.fleischer
//  * @since 07.06.2021
//  */
// export class ContactMatrixDelegate implements IContactMatrix {

//     private readonly contactMatrix: IContactMatrix;
//     private readonly maxCellTotal: number;
//     private readonly maxColTotal: number;

//     constructor(instant: number, contactCells: IContactCells, maxCellTotal: number, maxColTotal: number) {
//         this.contactMatrix = new ContactMatrixSums(instant, contactCells, 'CONTACT_PARTICIPANT');
//         this.maxCellTotal = maxCellTotal;
//         this.maxColTotal = maxColTotal;
//     }

//     getColumnValue(ageGroupIndex: number): number {
//         return this.contactMatrix.getColumnValue(ageGroupIndex);
//     }

//     getValueSum(): number {
//         return this.contactMatrix.getValueSum();
//     }

//     getInstant(): number {
//         return this.contactMatrix.getInstant();
//     }

//     getMaxCellValue(): number {
//         return this.maxCellTotal;
//     }

//     getMaxColumnValue(): number {
//         return this.maxColTotal;
//     }

//     getCellValue(indexContact: number, indexParticipant: number): number {
//         return this.contactMatrix.getCellValue(indexContact, indexParticipant);
//     }

// }
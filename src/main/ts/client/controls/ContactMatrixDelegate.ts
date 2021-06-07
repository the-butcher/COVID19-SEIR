import { IContactMatrix } from '../../common/modification/IContactMatrix';

/**
 * helper type for display in time-modification chart, where the full time range is the scope for max-cell-total and max-col-total
 *
 * @author h.fleischer
 * @since 07.06.2021
 */
export class ContactMatrixDelegate implements IContactMatrix {

    private readonly contactMatrix: IContactMatrix;
    private readonly maxCellTotal: number;
    private readonly maxColTotal: number;

    constructor(contactMatrix: IContactMatrix, maxCellTotal: number, maxColTotal: number) {

        this.contactMatrix = contactMatrix;
        this.maxCellTotal = maxCellTotal;
        this.maxColTotal = maxColTotal;

    }

    getInstant(): number {
        return this.contactMatrix.getInstant();
    }

    getMaxCellTotal(): number {
        return this.maxCellTotal;
    }

    getMaxColTotal(): number {
        return this.maxColTotal;
    }

    getContacts(indexContact: number, indexParticipant: number): number {
        return this.contactMatrix.getContacts(indexContact, indexParticipant);
    }

}
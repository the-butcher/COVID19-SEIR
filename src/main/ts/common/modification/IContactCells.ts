
/**
 * definition for types that can provide a cell-value by contact- and participant index
 *
 * @author h.fleischer
 * @since 11.04.2021
 */
export interface IContactCells {

    /**
     * get the cell value identified by contact-index and participant-index
     * @param indexContact
     * @param indexParticipant
     */
    getCellValue(indexContact: number, indexParticipant: number): number;

    /**
     * get the maximum cell value in this instance
     */
    getMaxCellValue(): number;

    /**
     * the the sum of all cell values
     */
    getCellSum(): number;

    // logSummary(ageGroupName: string): void;

}
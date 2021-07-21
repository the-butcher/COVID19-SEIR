import { IContactColumns } from './IContactColumns';

/**
 * definition for types that can provide a cell-value by contact- and participant index
 *
 * @author h.fleischer
 * @since 11.04.2021
 */
export interface IContactCells {

    getCellValue(indexContact: number, indexParticipant: number): number;

}
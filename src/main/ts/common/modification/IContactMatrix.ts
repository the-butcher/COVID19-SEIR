import { IContactColumns } from './IContactColumns';
import { IContactCells } from './IContactCells';
export interface IContactMatrix extends IContactCells, IContactColumns {

    getInstant(): number;

    getMaxCellValue(): number;

    getMaxColumnValue(): number;

    getValueSum(): number;

}
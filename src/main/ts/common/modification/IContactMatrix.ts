import { IContactCells } from './IContactCells';
import { IContactColumns } from './IContactColumns';
export interface IContactMatrix extends IContactCells, IContactColumns {

    /**
     * get the instance that this matrix is associated with
     */
    getInstant(): number;

    /**
     * get the full value of this matrix
     */
    getMatrixSum(): number;

    /**
     * get the maximum value that a matrix of this kind could possibly have
     */
    getMaxMatrixSum(): number;


}
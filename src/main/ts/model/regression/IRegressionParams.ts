import { IModification } from '../../common/modification/IModification';
import { IModificationValues } from '../../common/modification/IModificationValues';
import { ModificationContact } from '../../common/modification/ModificationContact';

export interface IRegressionParams<M extends IModification<IModificationValues>> {

    // /**
    //  * the point where regression values start
    //  */
    // instant: number

    /**
     * the point in time where points start to be considered for regression
     */
    instantA: number;

    /**
     * the point in time where points stop to be considered for regression
     */
    instantB: number;

    /**
     * the point in time where it is long term regression only
     */
    instantC: number;

    polyShares: number[];

    modifications: M[];

}
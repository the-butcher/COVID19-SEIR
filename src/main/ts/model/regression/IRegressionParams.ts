import { ModificationContact } from '../../common/modification/ModificationContact';

export interface IRegressionParams {

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

    polyShares: number[];

    modificationsContact: ModificationContact[];

}
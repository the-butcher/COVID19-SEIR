import { ICoordinate } from '../../util/ICoordinate';

/**
 * coordinates are:
 * x: instant
 * y: percentage
 */
export interface IVaccinationConfig {

    pA1: ICoordinate;
    cA1: ICoordinate;
    cB1: ICoordinate;

    pA2: ICoordinate;
    cA2: ICoordinate;
    cB2: ICoordinate;

    pBN: ICoordinate;

    /**
     * stretch of duration
     */
    sD: number;

    /**
     * slope at point C (vacc2 at at instantPre)
     */
    sC: number;

}
import { ICoordinate } from '../../util/ICoordinate';

/**
 * coordinates are:
 * x: instant
 * y: percentage
 */
export interface IVaccinationConfig {

    pA: ICoordinate;
    cA: ICoordinate;
    cB: ICoordinate;
    pB: ICoordinate;

    /**
     * stretch of duration
     */
    sD: number;

    /**
     * slope at point C (vacc2 at at instantPre)
     */
    sC: number;

}
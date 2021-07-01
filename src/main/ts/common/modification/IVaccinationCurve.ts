import { ICoordinate } from '../../util/ICoordinate';

/**
 * coordinates are:
 * x: instant
 * y: percentage
 */
export interface IVaccinationCurve {

    pA: ICoordinate;
    cA: ICoordinate;
    cB: ICoordinate;
    pB: ICoordinate;
    vacc1ToVacc2Weeks: number;

}
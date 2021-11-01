import { Demographics } from '../demographics/Demographics';
import { IModificationValuesSettings } from './IModificationValuesSettings';
import { AModification } from './AModification';
import { IModificationValuesRegression } from './IModificationValuesRegression';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 01.11.2021
 */
export class ModificationRegression extends AModification<IModificationValuesRegression> {

    constructor(modificationParams: IModificationValuesRegression) {
        super('INSTANT', modificationParams);
    }

    getModificationCount(): number {
        return this.modificationValues.back_days;
    }

    /**
     * number of days that the polynomial regression counts
     * @returns
     */
    getPolynomialDays(): number {
        return this.modificationValues.poly_days;
    }

}
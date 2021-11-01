import { IRegressionParams } from '../../model/regression/Regression';
import { IModificationValues } from './IModificationValues';



/**
 * @author h.fleischer
 * @since 01.11.2021
 */
export interface IModificationValuesRegression extends IModificationValues {

    /**
     * number of modifications to consider in regression analyses when looking back
     */
    back_days: number;

    /**
     * number of days that polynomial regression has a weight along the future axis
     */
    poly_days: number;

}
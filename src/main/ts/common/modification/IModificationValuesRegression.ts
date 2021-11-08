import { IModificationValues } from './IModificationValues';

export interface IRegressionConfig {
    back_days_a: number;
    back_days_b: number;
    poly_weight: number;
}

/**
 * @author h.fleischer
 * @since 01.11.2021
 */
export interface IModificationValuesRegression extends IModificationValues {

    multiplier_configs?: { [K in string]: IRegressionConfig };

    correction_configs?: { [K in string]: IRegressionConfig };

    multiplier_randoms?: { [K in string]: number };

    correction_randoms?: { [K in string]: number };

}
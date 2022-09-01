import { ILoessResult } from './ILoessResult';

export interface IRegressionResult {
    regression?: number;
    loess?: ILoessResult;
    valueA?: number;
    valueB?: number;
    slope?: number;
    ci95Max?: number;
    ci95Min?: number;
    ci95Dim?: number;
}

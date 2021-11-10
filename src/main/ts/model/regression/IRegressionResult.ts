import { ILoessResult } from './ILoessResult';

export interface IRegressionResult {
    regression?: number;
    model?: number;
    loess?: ILoessResult;
    ci95Max?: number;
    ci95Min?: number;
    ci95Dim?: number;
}

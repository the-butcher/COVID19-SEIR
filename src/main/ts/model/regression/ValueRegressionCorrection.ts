import { ModificationContact } from '../../common/modification/ModificationContact';
import { IRegressionParams, IRegressionResult } from './Regression';
import { ValueRegressionBase } from './ValueRegressionBase';

export interface IRegressionParamsCorrection extends IRegressionParams {
    ageGroupIndex: number;
}

export class ValueRegressionCorrection extends ValueRegressionBase {

    private readonly ageGroupIndex: number;

    constructor(params: IRegressionParamsCorrection) {
        super(params);
        this.ageGroupIndex = params.ageGroupIndex;
        this.setup();
    }

    toValueY(modificationContact: ModificationContact): number {
        return modificationContact.getCorrectionValue(this.ageGroupIndex);
    }

}
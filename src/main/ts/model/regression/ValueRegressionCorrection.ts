import { Demographics } from './../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { IRegressionParams } from './IRegressionParams';
import { ValueRegressionBase } from './ValueRegressionBase';

export interface IRegressionParamsCorrection extends IRegressionParams<ModificationContact> {
    ageGroupIndex: number;
}

export class ValueRegressionCorrection extends ValueRegressionBase<ModificationContact> {

    private readonly ageGroupIndex: number;

    constructor(params: IRegressionParamsCorrection) {
        super(params);
        this.ageGroupIndex = params.ageGroupIndex;
        this.setup();
    }

    getName(): string {
        return Demographics.getInstance().getAgeGroups()[this.ageGroupIndex].getName();
    }

    toValueY(modificationContact: ModificationContact): number {
        return modificationContact.getCorrectionValue(this.ageGroupIndex);
    }

}
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelConstants } from '../ModelConstants';
import { IRegressionParams } from './IRegressionParams';
import { ValueRegressionBase } from './ValueRegressionBase';

export interface IRegressionParamsCorrection extends IRegressionParams<ModificationContact> {
    ageGroupIndex: number;
}

export class ValueRegressionCorrectionTotal extends ValueRegressionBase<ModificationContact> {

    private readonly ageGroupIndex: number;

    constructor(params: IRegressionParamsCorrection) {
        super(params);
        this.ageGroupIndex = params.ageGroupIndex;
        this.setup();
    }

    getName(): string {
        return ModelConstants.AGEGROUP_NAME_______ALL;
    }

    toValueY(modificationContact: ModificationContact): number {
        let correctionTotal = 0;
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            correctionTotal += modificationContact.getCorrectionValue(ageGroup.getIndex()) * ageGroup.getAbsValue();
        });
        return correctionTotal / Demographics.getInstance().getAbsTotal();
    }

}
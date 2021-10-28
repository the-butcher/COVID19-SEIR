import { ModificationContact } from './../../common/modification/ModificationContact';
import { IRegressionParams } from './Regression';
import { ValueRegressionBase } from './ValueRegressionBase';

export interface IRegressionParamsMultiplier extends IRegressionParams {
    modificationCount: number;
    contactCategory: string;
}

export class ValueRegressionMultiplier extends ValueRegressionBase {

    private readonly contactCategory: string;

    constructor(params: IRegressionParamsMultiplier) {
        super(params);
        this.contactCategory = params.contactCategory;
    }

    toValueY(modificationContact: ModificationContact): number {
        return modificationContact.getCategoryValue(this.contactCategory);
    }

}
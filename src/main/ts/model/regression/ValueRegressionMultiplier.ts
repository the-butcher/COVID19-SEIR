import { ModificationContact } from './../../common/modification/ModificationContact';
import { IRegressionParams } from './IRegressionParams';
import { ValueRegressionBase } from './ValueRegressionBase';

export interface IRegressionParamsMultiplier extends IRegressionParams<ModificationContact> {
    contactCategory: string;
}

export class ValueRegressionMultiplier extends ValueRegressionBase<ModificationContact> {

    private readonly contactCategory: string;

    constructor(params: IRegressionParamsMultiplier) {
        super(params);
        this.contactCategory = params.contactCategory;
        this.setup();
    }

    getName(): string {
        return this.contactCategory;
    }

    toValueY(modificationContact: ModificationContact): number {
        return modificationContact.getCategoryValue(this.contactCategory);
    }

}
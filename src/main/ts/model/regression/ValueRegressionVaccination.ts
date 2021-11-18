import { Demographics } from './../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { IRegressionParams } from './IRegressionParams';
import { ValueRegressionBase } from './ValueRegressionBase';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';

export interface IRegressionParamsVaccination extends IRegressionParams<ModificationVaccination> {
    ageGroupName: string;
    vaccinationPropertyGetter: (m: ModificationVaccination) => number;
}

export class ValueRegressionVaccination extends ValueRegressionBase<ModificationVaccination> {

    private readonly ageGroupName: string;
    private readonly vaccinationPropertyGetter: (m: ModificationVaccination) => number;
    
    constructor(params: IRegressionParamsVaccination) {
        super(params);
        this.ageGroupName = params.ageGroupName;
        this.vaccinationPropertyGetter = params.vaccinationPropertyGetter;
        this.setup();
    }

    getName(): string {
        return Demographics.getInstance().findAgeGroupByName(this.ageGroupName).getName();
    }

    toValueY(modificationVacciniation: ModificationVaccination): number {
        return this.vaccinationPropertyGetter(modificationVacciniation);
    }

}
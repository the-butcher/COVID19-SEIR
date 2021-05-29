import { IAgeGroupConfig } from './IAgeGroupConfig';

/**
 * this type refers to a single age group as of demography
 * an age group does not necessarily have to have a corresponding age group in the contact matrix,
 * rather it should use the most suitable value from the contact matrix
 *
 * @author h.fleischer
 * @since 21.05.2021
 */
export class AgeGroup {

    private readonly index: number;
    private readonly name: string;
    private readonly vacc: number;
    private readonly absValue: number;

    constructor(index: number, ageGroupParams: IAgeGroupConfig) {
        this.index = index;
        this.name = ageGroupParams.name;
        this.vacc = ageGroupParams.vacc; // appears to give a decent priority for older ages
        this.absValue = ageGroupParams.pG;
        console.log('vacc', this.vacc);
    }

    getIndex(): number {
        return this.index;
    }

    getName(): string {
        return this.name;
    }

    getVacc(): number {
        return this.vacc;
    }

    getAbsValue(): number {
        return this.absValue;
    }

}
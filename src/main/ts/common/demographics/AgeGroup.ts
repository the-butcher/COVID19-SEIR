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
    private readonly prio: number;
    private readonly acpt: number;
    private readonly absValue: number;

    constructor(index: number, ageGroupParams: IAgeGroupConfig) {
        this.index = index;
        this.name = ageGroupParams.name;
        this.prio = Math.pow(1.1, index) - 1;
        this.acpt = ageGroupParams.acpt;
        this.absValue = ageGroupParams.pG;
        console.log('acceptance in', this.name, this.acpt, this.prio);
    }

    getIndex(): number {
        return this.index;
    }

    getName(): string {
        return this.name;
    }

    getPrio(): number {
        return this.prio;
    }

    getAcpt(): number  {
        return this.acpt;
    }

    getAbsValue(): number {
        return this.absValue;
    }

}
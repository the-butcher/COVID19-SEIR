import { IContactMatrixConfig } from './IContactMatrixConfig';

/**
 * this type refers to a single contact category (family|school|work|other)
 * for that category a contact matrix is held specifying all age-groups to age-group contact counts
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export class ContactCategory {

    private readonly name: string;
    private readonly ageGroupTotals: number[];
    private readonly data: number[][];
    private readonly categoryTotal: number;

    constructor(contactCategoryParams: IContactMatrixConfig) {
        this.name = contactCategoryParams.name;
        this.ageGroupTotals = [];
        this.data = contactCategoryParams.data;
        this.categoryTotal = 0;
        const ageGroups = contactCategoryParams.ageGroups;
        for (let ageGroupIndex = 0; ageGroupIndex < this.data.length; ageGroupIndex++) {
            this.ageGroupTotals[ageGroupIndex] = 0;
            for (const val of this.data[ageGroupIndex]) {
                this.ageGroupTotals[ageGroupIndex] += val * ageGroups[ageGroupIndex].pG;
                this.categoryTotal += val;
            }
        }
    }

    getName(): string {
        return this.name;
    }

    getCategoryTotal(): number {
        return this.categoryTotal;
    }

    getAgeGroupTotal(ageGroupIndex: number): number {
        return this.ageGroupTotals[ageGroupIndex];
    }

    getData(indexContact: number, indexParticipant: number) {
        return this.data[indexContact][indexParticipant];
    }

}
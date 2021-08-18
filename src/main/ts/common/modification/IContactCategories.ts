import { ContactCategory } from '../demographics/ContactCategory';

export interface IContactCategories {

    getCategories(): ContactCategory[];

    // getCategoryValue(contactCategoryName: string): number;

    // getCategorySum(): number;

}
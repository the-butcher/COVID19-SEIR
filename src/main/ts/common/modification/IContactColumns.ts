import { ContactCategory } from '../demographics/ContactCategory';

export interface IContactColumns {

    getColumnValue(ageGroupIndex: number): number;

    getMaxColumnValue(): number;

    getColumnSum(): number;

    getMaxColumnSum(): number;

}
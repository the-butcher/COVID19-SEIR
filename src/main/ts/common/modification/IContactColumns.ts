export interface IContactColumns {

    getColumnValue(ageGroupIndex: number): number;

    getMaxColumnValue(): number;

    getColumnSum(): number;

    getMaxColumnSum(): number;

}
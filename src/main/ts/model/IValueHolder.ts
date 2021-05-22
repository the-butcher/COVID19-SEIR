export interface IValueHolder {

    /**
     * get the absolute root total
     */
    getAbsTotal(): number;

    /**
     * get the normalized value of this compartment
     */
    getNrmValue(): number;

    /**
     * get the absolute value of this compartment
     */
    getAbsValue(): number;

}
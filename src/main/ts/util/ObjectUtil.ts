/**
 * utility for checking object state
 *
 * @author h.fleischer
 * @since 01.03.2020
 */
export class ObjectUtil {

    static readonly COMMA_SEPARATOR = (0.1).toLocaleString().charAt(1);
    static readonly THSND_SEPARATOR = (1000).toLocaleString().charAt(1);

    static isEmpty(data: any): boolean {
        return !ObjectUtil.isNotEmpty(data);
    }

    static isNotEmpty(data: any): boolean {
        return (data !== null && data !== undefined && data !== "" && data !== []);
    }

    static createDownloadName(): string {
        return 'timeline_' + Date.now();
    }

    static createId(): string {
        return Math.round(Math.random() * 1000000).toString(16);
    }

    /**
     * normalizes an array of numbers so that the resulting value array sums up to 1
     * @param values
     * @returns
     */
    static normalize(values: number[]): number[] {
        const valueSum = values.reduce((a, b) => a + b, 0);
        return values.map(v => v / valueSum);
    }

    // /**
    //  * calculate a values for vaccinations suitable to a given population size
    //  * @param absTotal
    //  * @returns
    //  */
    // static getMaxVaccinations(absTotal: number): number {
    //     const log = Math.round(Math.log10(absTotal));
    //     const div = Math.pow(10, log) * 0.25;
    //     return Math.round(absTotal / div) * div * 0.02;
    // }

}
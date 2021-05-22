/**
 * utility class for managing time related units
 */
export class TimeUtil {

    static readonly MILLISECONDS_PER_MINUTE = 60 * 1000;
    static readonly MILLISECONDS_PER_HOUR = 60 * TimeUtil.MILLISECONDS_PER_MINUTE;
    static readonly MILLISECONDS_PER_DAY: number = 24 * TimeUtil.MILLISECONDS_PER_HOUR;

    static formatCategoryDate(instant: number): string {
        const date = new Date(instant);
        // @ts-ignore
        const day = String(date.getDate()).padStart(2, '0');
        // @ts-ignore
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return day + '.' + month + '.';
    }

}
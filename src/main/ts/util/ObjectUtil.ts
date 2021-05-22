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

    static createId(): string {
        return Math.round(Math.random() * 1000000).toString(16);
    }

}
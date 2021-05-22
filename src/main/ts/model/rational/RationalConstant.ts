import { IRational } from './IRational';

/**
 * implementation of IRational providing a constant value
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class RationalConstant implements IRational {

    static readonly EVERYTHING = new RationalConstant(1);
    static readonly NOTHING = new RationalConstant(0);

    private readonly value: number;

    constructor(value: number)  {
        this.value = value;
    }

    getDuration(): number {
        return 0;
    }

    getRate(dT: number, tT: number): number {
        return this.value;
    }


}
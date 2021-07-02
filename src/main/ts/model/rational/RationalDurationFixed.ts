import { IRational } from './IRational';

/**
 * implementation of IRational for a specific duration
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class RationalDurationFixed implements IRational {

    private readonly duration: number;

    constructor(duration: number) {
        this.duration = duration;
    }

    getDuration(): number {
        return this.duration;
    }

    getRate(dT: number, tT: number): number {
        return this.duration !== 0 ? dT / this.duration : 0;
    }

}
import { IRational } from './IRational';

/**
 * implementation of IRational for the reproduction, provides a rate for a given amount of time
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class RationalReproduction implements IRational {

    private readonly r0: number;
    private readonly duration: number;

    constructor(r0: number, duration: number) {
        this.r0 = r0;
        this.duration = duration;
    }

    getDuration(): number {
        return this.duration;
    }

    getR0(): number {
        return this.r0;
    }

    getRate(dT: number): number {
        return this.duration !== 0 ? this.r0 * dT / this.duration : 0;
    }

}
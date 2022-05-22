import { Demographics } from '../demographics/Demographics';
import { AModification } from './AModification';
import { IModificationValuesStrain } from './IModificationValuesStrain';

/**
 * implementation of IModification describing a single virus strain
 * Improve: add values for immune escape
 *
 * @author h.fleischer
 * @since 24.05.2021
 */
export class ModificationStrain extends AModification<IModificationValuesStrain> {

    constructor(modificationValues: IModificationValuesStrain) {
        super('INSTANT', modificationValues);
    }

    isPrimary(): boolean {
        return this.modificationValues.primary;
    }

    getR0(): number {
        return this.modificationValues.r0;
    }

    getIncidence(): number {
        return this.modificationValues.dstIncidence;
    }

    getSerialInterval(): number {
        return this.modificationValues.serialInterval;
    }

    getIntervalScale(): number {
        return this.modificationValues.intervalScale;
    }

    getImmuneEscape(): number {
        return this.modificationValues.immuneEscape;
    }

    getPow(): number {
        return this.modificationValues.pow;
    }

    getMax(): number {
        return this.modificationValues.max;
    }

    getXmb(): number {
        return this.modificationValues.xmb;
    }

    getXmr(): number {
        return this.modificationValues.xmr;
    }

    // calculateDiscoveryRate(positivityRate: number, testRate: number): number {

    //     // \left(x\ \cdot s\ +\ m^{\frac{1}{p}}\ \ \right)^{p}-x\cdot\left(s\ +\ m^{\frac{1}{p}}\ \ \right)^{p}

    //     const pow = -this.modificationValues.pow;
    //     const max = this.modificationValues.max;
    //     const slp = this.modificationValues.xmb - testRate * this.modificationValues.xmr; // higher number means steeper (less tests per person means steeper slope = less cases found for )

    //     const sqm = Math.pow(max, 1 / pow);

    //     return Math.pow(positivityRate * slp + sqm, pow) - positivityRate * Math.pow(slp + sqm, pow);

    // }

    // calculatePositivityRate(cases: number, testRate: number): number {
    //     return cases / Demographics.getInstance().getAbsTotal() / testRate;
    // }

}
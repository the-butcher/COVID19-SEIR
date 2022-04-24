import { Demographics } from './../demographics/Demographics';
import { IModificationValuesSettings } from './IModificationValuesSettings';
import { AModification } from './AModification';
import { getMaxListeners } from 'process';
import { ObjectUtil } from '../../util/ObjectUtil';
import { Modifications } from './Modifications';

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationSettings extends AModification<IModificationValuesSettings> {

    static setupInstance(modificationValuesSettings: IModificationValuesSettings) {
        this.instance = new ModificationSettings(modificationValuesSettings);
    }

    static getInstance(): ModificationSettings {
        return this.instance;
    }
    static instance: ModificationSettings;

    constructor(modificationParams: IModificationValuesSettings) {
        super('RANGE', modificationParams);
    }

    getInitialUndetected(): number {
        return this.modificationValues.undetected;
    }

    getQuarantine(ageGroupIndex: number): number {
        return this.modificationValues.quarantine;
    }

    getReexposure(): number {
        return this.modificationValues.reexposure;
    }

    getDead(): number {
        return this.modificationValues.dead;
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

    /**
     * calculate a discovery rate for a given day
     * 1 / (trimmedPositivityRate * 260 - 1.3) + 0.14:
     * 0.0000      0.9413
     * 0.0100      0.9092
     * 0.0200      0.3964
     * 0.0400      0.2499
     * 0.3000      0.1530
     * 
     * 1 / (trimmedPositivityRate * 300 + 1.25) + 0.17 - trimmedPositivityRate / 10
     * 0.0000      0.9700
     * 0.0100      0.4043
     * 0.0200      0.3059
     * 0.0400      0.2415
     * 0.1000      0.1920
     * 
     * @param baseDiscoveryRate
     * @param basePositivityRate
     * @param positivityRate
     * @returns
     */
    calculateDiscoveryRate(positivityRate: number, testRate: number): number {

        // \left(x\ \cdot2\ +\ 0.70^{\frac{1}{-4}}\ \ \right)^{-4}

        const pow = -this.modificationValues.pow;
        const max = this.modificationValues.max;
        const slp = this.modificationValues.xmb - testRate * this.modificationValues.xmr; // higher number means steeper (less tests per person means steeper slope = less cases found for )

        // if (instant % TimeUtil.MILLISECONDS_PER____DAY === 0) {
        //     console.log(TimeUtil.formatCategoryDateFull(instant), slp);
        // }

        // return Math.pow(positivityRate * 1.1 + 1, -10);
        // return Math.pow(positivityRate * 2.0 + 1.10, -4);

        return Math.pow(positivityRate * slp + Math.pow(max, 1 / pow), pow);

    }

    calculatePositivityRate(cases: number, testRate: number): number {
        const scaledCases = cases * 100 / Demographics.getInstance().getAbsTotal();
        return (this.modificationValues.reg[0] * scaledCases) / testRate;
    }

    setEquationParams(reg: number[]) {
        this.modificationValues.reg = reg;
    }

}
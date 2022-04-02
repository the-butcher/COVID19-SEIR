import { RationalDurationFixed } from '../rational/RationalDurationFixed';
import { RationalReproduction } from '../rational/RationalReproduction';
import { CompartmentBase } from './CompartmentBase';
import { ECompartmentType } from './ECompartmentType';

/**
 * extension to CompartmentBase, adding the immunity waning aspect
 *
 * @author h.fleischer
 * @since 01.04.2022
 */
export class CompartmentRecovery extends CompartmentBase {

    private readonly immunity: number;

    constructor(absTotal: number, absValue: number, ageGroupIndex: number, strainId: string, immunity: number, duration: number, chainId: string) {
        super(ECompartmentType.R___REMOVED_ID, absTotal, absValue, ageGroupIndex, strainId, new RationalDurationFixed(duration), chainId);
        this.immunity = immunity;
    }

    getImmunity(): number {
        return this.immunity;
    }

}
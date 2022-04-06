import { IRational } from '../rational/IRational';
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
export class CompartmentImmunity extends CompartmentBase {

    private readonly immunity: number;

    constructor(compartmentType: ECompartmentType, absTotal: number, absValue: number, ageGroupIndex: number, ageGroupName: string, strainId: string, immunity: number, duration: IRational, chainId: string) {
        super(compartmentType, absTotal, absValue, ageGroupIndex, ageGroupName, strainId, duration, chainId);
        this.immunity = immunity;
    }

    getImmunity(): number {
        return this.immunity;
    }

}
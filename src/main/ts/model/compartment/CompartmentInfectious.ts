import { RationalReproduction } from '../rational/RationalReproduction';
import { CompartmentBase } from './CompartmentBase';
import { ECompartmentType } from './ECompartmentType';

/**
 * extension to CompartmentBase, adding the infectious aspect
 * a single CompartmentInfectious covers a single stage through a compartment chain fitted underneath a weibull distribution
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class CompartmentInfectious extends CompartmentBase {

    private readonly reproductionRatio: RationalReproduction;
    private readonly preSymptomatic: boolean

    constructor(compartmentType: ECompartmentType, absTotal: number, absValue: number, ageGroupIndex: number, r0: number, duration: number, preSymptomatic: boolean) {
        super(compartmentType, absTotal, absValue, ageGroupIndex, duration);
        this.reproductionRatio = new RationalReproduction(r0, duration);
        this.preSymptomatic = preSymptomatic;
    }

    isPreSymptomatic(): boolean {
        return this.preSymptomatic;
    }

    getReproductionRatio(): RationalReproduction {
        return this.reproductionRatio;
    }

}
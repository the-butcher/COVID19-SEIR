import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { Weibull } from '../../util/Weibull';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { ECompartmentType } from './ECompartmentType';
import { RationalDurationFixed } from '../rational/RationalDurationFixed';

export interface ICompartmentParamsRecovery {
    type: ECompartmentType;
    immunity: number; // reproduction outbound from this specific compartment
    instantA: number; // start of this compartment (with respect to mean)
    instantB: number; // end of this compartment (with respect to mean)
    i0Normal: number;
}

/**
 * helper type that can provide a number of compartment definitions, distributed underneath a weibull distribution
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class CompartmentChainRecovery {

    static readonly NO_CONTINUATION = new RationalDurationFixed(0);

    static getInstance(): CompartmentChainRecovery {
        if (ObjectUtil.isEmpty(this.instanceRecovery)) {
            this.instanceRecovery = new CompartmentChainRecovery(Weibull.getInstanceRecovery());
        }
        return this.instanceRecovery;

    }
    private static instanceRecovery: CompartmentChainRecovery;

    private compartmentParams: ICompartmentParamsRecovery[];
    private readonly weibull: Weibull;

    constructor(weibull: Weibull) {
        this.weibull = weibull;


    }

    getStrainedCompartmentParams(timeToWane: number): ICompartmentParamsRecovery[] {

        this.compartmentParams = [];

        let compartmentCount: number;
        let normalizedDuration: number;

        let instantA: number;
        let instantB: number;
        let immunity: number;

        let shareOfPreSymptomaticInfection1 = 0;

        compartmentCount = Math.min(10, Math.ceil(timeToWane));
        normalizedDuration = 1 / compartmentCount; // the duration of each compartment before incubation
        instantA = 0;
        for (let compartmentIndex = 0; compartmentIndex < compartmentCount; compartmentIndex++) {
            instantB = normalizedDuration * (compartmentIndex + 1);
            immunity = 0.9 * this.weibull.getDistribution((1 - (instantA + instantB) / 2));
            // console.log('wb0', (instantA + instantB) / 2, immunity);
            shareOfPreSymptomaticInfection1 += immunity;
            this.compartmentParams.push({
                type: ECompartmentType.I___INFECTIOUS,
                immunity: immunity,
                instantA: instantA,
                instantB: instantB,
                i0Normal: normalizedDuration
            });
            instantA = instantB;
        }

        const strainedCompartmentParams: ICompartmentParamsRecovery[] = [];
        const toStrainedValue = (normalized: number) => normalized * timeToWane * TimeUtil.MILLISECONDS_PER____DAY * 30;

        this.compartmentParams.forEach(compartmentParam => {
            strainedCompartmentParams.push({
                type: compartmentParam.type,
                immunity: compartmentParam.immunity,
                instantA: Math.round(toStrainedValue(compartmentParam.instantA)),
                instantB: Math.round(toStrainedValue(compartmentParam.instantB)),
                i0Normal: compartmentParam.i0Normal
            });
        });
        // console.log('strainedCompartmentParams', strainedCompartmentParams);

        return strainedCompartmentParams;

    }

    getCompartmentParams(): ICompartmentParamsRecovery[] {
        return this.compartmentParams;
    }

}


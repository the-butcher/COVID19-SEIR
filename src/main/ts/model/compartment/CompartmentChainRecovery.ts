import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { Weibull } from '../../util/Weibull';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { ECompartmentType } from './ECompartmentType';
import { RationalDurationFixed } from '../rational/RationalDurationFixed';

export interface ICompartmentParamsRecovery {
    type: ECompartmentType;
    r0: number; // reproduction outbound from this specific compartment
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
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new CompartmentChainRecovery();
        }
        return this.instance;
    }
    private static instance: CompartmentChainRecovery;

    private readonly compartmentParams: ICompartmentParamsRecovery[];

    constructor() {

        this.compartmentParams = [];

        let compartmentCount: number;
        let normalizedDuration: number;

        let instantA: number;
        let instantB: number;
        let reproduction: number;

        let shareOfPreSymptomaticInfection1 = 0;

        compartmentCount = 5;
        normalizedDuration = 1 / compartmentCount; // the duration of each compartment before incubation
        instantA = 0;
        for (let compartmentIndex = 0; compartmentIndex < compartmentCount; compartmentIndex++) {
            instantB = normalizedDuration * (compartmentIndex + 1);
            reproduction = (Weibull.getInstanceRecovery().getNormalizedDistribution(instantB) - Weibull.getInstanceRecovery().getNormalizedDistribution(instantA));
            shareOfPreSymptomaticInfection1 += reproduction;
            this.compartmentParams.push({
                type: ECompartmentType.I_INFECTIOUS_A,
                r0: reproduction,
                instantA: instantA,
                instantB: instantB,
                i0Normal: normalizedDuration
            });
            instantA = instantB;
        }

    }

    getStrainedCompartmentParams(strainValues: IModificationValuesStrain): ICompartmentParamsRecovery[] {

        const strainedCompartmentParams: ICompartmentParamsRecovery[] = [];
        const toStrainedValue = (normalized: number) => normalized * strainValues.timeToWane * TimeUtil.MILLISECONDS_PER____DAY * 30;

        this.compartmentParams.forEach(compartmentParam => {
            strainedCompartmentParams.push({
                type: compartmentParam.type,
                r0: compartmentParam.r0 * 2 * strainValues.timeToWane,
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


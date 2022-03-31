import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { Weibull } from '../../util/Weibull';
import { IModificationValuesStrain } from '../../common/modification/IModificationValuesStrain';
import { ECompartmentType } from './ECompartmentType';
import { RationalDurationFixed } from '../rational/RationalDurationFixed';

export interface ICompartmentParams {
    type: ECompartmentType;
    r0: number; // reproduction outbound from this specific compartment
    instantA: number; // start of this compartment (with respect to mean)
    instantB: number; // end of this compartment (with respect to mean)
    i0Normal: number;
    presymptomatic: boolean;
}

/**
 * helper type that can provide a number of compartment definitions, distributed underneath a weibull distribution
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class CompartmentChainReproduction {

    static readonly INCUBATION_TO_MEAN__________RATIO = 0.9;
    static readonly COMPARTMENT_COUNT_PRE__INCUBATION = 3; // 5;
    static readonly COMPARTMENT_COUNT_POST_INCUBATION = 6; // 11;

    static readonly NO_REPRODUCTION = 0;
    static readonly NO_CONTINUATION = new RationalDurationFixed(0);

    static getInstance(): CompartmentChainReproduction {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new CompartmentChainReproduction();
        }
        return this.instance;
    }
    private static instance: CompartmentChainReproduction;

    private readonly compartmentParams: ICompartmentParams[];
    private readonly shareOfPreSymptomaticInfection: number;

    constructor() {

        this.compartmentParams = [];

        const normalizedMean = Weibull.getInstanceReproduction().getNormalizedMean();
        const normalizedIncubation = normalizedMean * CompartmentChainReproduction.INCUBATION_TO_MEAN__________RATIO;

        let compartmentCount: number;
        let normalizedDuration: number;

        let instantA: number;
        let instantB: number;
        let reproduction: number;

        let shareOfPreSymptomaticInfection1 = 0;

        compartmentCount = CompartmentChainReproduction.COMPARTMENT_COUNT_PRE__INCUBATION;
        normalizedDuration = normalizedIncubation / compartmentCount; // the duration of each compartment before incubation
        instantA = 0;
        for (let compartmentIndex = 1; compartmentIndex <= compartmentCount; compartmentIndex++) {
            instantB = normalizedDuration * compartmentIndex;
            reproduction = (Weibull.getInstanceReproduction().getNormalizedDistribution(instantB) - Weibull.getInstanceReproduction().getNormalizedDistribution(instantA));
            shareOfPreSymptomaticInfection1 += reproduction;
            this.compartmentParams.push({
                type: ECompartmentType.I_INFECTIOUS_A,
                r0: reproduction,
                instantA: instantA - normalizedMean,
                instantB: instantB - normalizedMean,
                i0Normal: normalizedDuration,
                presymptomatic: true
            });
            instantA = instantB;
        }
        compartmentCount = CompartmentChainReproduction.COMPARTMENT_COUNT_POST_INCUBATION;
        normalizedDuration = (1 - normalizedIncubation) / compartmentCount; // the duration of each compartment after incubation
        for (let compartmentIndex = 1; compartmentIndex <= compartmentCount; compartmentIndex++) {
            instantB = normalizedIncubation + normalizedDuration * compartmentIndex;
            reproduction = (Weibull.getInstanceReproduction().getNormalizedDistribution(instantB) - Weibull.getInstanceReproduction().getNormalizedDistribution(instantA));
            this.compartmentParams.push({
                type: ECompartmentType.I_INFECTIOUS_A,
                r0: reproduction,
                instantA: instantA - normalizedMean,
                instantB: instantB - normalizedMean,
                i0Normal: normalizedDuration,
                presymptomatic: false
            });
            instantA = instantB;
        }

        this.shareOfPreSymptomaticInfection = shareOfPreSymptomaticInfection1;

    }

    getStrainedCompartmentParams(strainValues: IModificationValuesStrain): ICompartmentParams[] {

        const mean = strainValues.serialInterval; // Weibull.getInstance().getNormalizedMean() * strain.getSerialInterval();

        const strainedCompartmentParams: ICompartmentParams[] = [];
        const toStrainedValue = (normalized: number) => normalized * strainValues.serialInterval * strainValues.intervalScale + mean;

        strainedCompartmentParams.push({
            type: ECompartmentType.E______EXPOSED,
            r0: CompartmentChainReproduction.NO_REPRODUCTION,
            instantA: 0,
            instantB: Math.round(toStrainedValue(this.compartmentParams[0].instantA) * TimeUtil.MILLISECONDS_PER____DAY),
            i0Normal: 0,
            presymptomatic: true
        });

        this.compartmentParams.forEach(compartmentParam => {
            strainedCompartmentParams.push({
                type: compartmentParam.type,
                r0: compartmentParam.r0 * strainValues.r0,
                instantA: Math.round(toStrainedValue(compartmentParam.instantA) * TimeUtil.MILLISECONDS_PER____DAY),
                instantB: Math.round(toStrainedValue(compartmentParam.instantB) * TimeUtil.MILLISECONDS_PER____DAY),
                i0Normal: compartmentParam.i0Normal,
                presymptomatic: compartmentParam.presymptomatic
            });
        });
        // console.log('strainedCompartmentParams', strainedCompartmentParams);

        return strainedCompartmentParams;

    }

    getShareOfPresymptomaticInfection(): number {
        return this.shareOfPreSymptomaticInfection;
    }

    getCompartmentParams(): ICompartmentParams[] {
        return this.compartmentParams;
    }

}


import { IDiscoveryValueSet } from './IDiscoveryValueSet';
import { IModificationValues } from './IModificationValues';


/**
 * definition for parameters defining a live IStrain instance
 *
 * @author h.fleischer
 * @since 23.04.2021
 */
export interface IModificationValuesStrain extends IModificationValues {

    /**
     * get the base reproduction number of this strain
     */
    r0: number;

    /**
     * is this the primary strain in the model (the first strain and as such not-deletable)
     */
    primary: boolean;

    /**
     * get the serial interval of this strain
     */
    serialInterval: number;

    /**
     * get the interval scale of this strain (basically a "stretch")
     */
    intervalScale: number;

    /**
     * get the ratio of immune escape for this strain
     * 0 would mean, no recovered or vaccinated individual would be infected until immunity has vanished
     * @deprecated - needs to be vaccEscape
     */
    immuneEscape: number;

    /**
     * more specific immune escapes (by other strain's id)
     */
    strainEscape: { [K in string]: number };

    /**
     * time in months for total waning of immunity
     */
    timeToWane: number;

    /**
     * the initial incidence of this strain
     */
    dstIncidence: number;

    preIncidence?: number;

    /**
     * calculated incidences at preload time
     */
    preIncidences?: number[];

    /**
     * target reproduction rates at preload time
     */
    preGrowthRate?: number[];

    transmissionRisk?: number;

}
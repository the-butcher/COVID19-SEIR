import { IRational } from '../rational/IRational';
import { ObjectUtil } from './../../util/ObjectUtil';
import { ECompartmentType } from './ECompartmentType';
import { ICompartment } from './ICompartment';

/**
 * basic model compartment
 *
 * TODO maybe split to base and age-group-base
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export class CompartmentBase implements ICompartment {

    private readonly id: string;
    private readonly compartmentType: ECompartmentType;
    private readonly absTotal: number;
    private nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly ageGroupName: string;
    private readonly strainId: string;

    private readonly continuationRatio: IRational;

    constructor(compartmentType: ECompartmentType, absTotal: number, absValue: number, ageGroupIndex: number, ageGroupName: string, strainId: string, continuationRatio: IRational, chainId: string) {
        this.id = ObjectUtil.createCompartmentId(compartmentType, strainId, ageGroupIndex, chainId);
        this.compartmentType = compartmentType;
        this.absTotal = absTotal;
        this.nrmValue = absValue * 1.0 / this.absTotal;
        this.ageGroupIndex = ageGroupIndex;
        this.ageGroupName = ageGroupName;
        this.strainId = strainId;
        this.continuationRatio = continuationRatio;
    }

    getId(): string {
        return this.id;
    }

    /**
     * the reference population (entire population)
     * @returns
     */
    getAbsTotal(): number {
        return this.absTotal;
    }

    /**
     * normalized value with respect to full population
     * @returns
     */
    getNrmValue(): number {
        return this.nrmValue;
    }

    setNrmValue(nrmValue: number): void {
        this.nrmValue = nrmValue;
    }

    getAbsValue(): number {
        return this.nrmValue * this.absTotal;
    }

    // getIncomingCompartment(): ICompartment {
    //     return this;
    // }

    // getOutgoingCompartment(): ICompartment {
    //     return this;
    // }

    getCompartmentType(): ECompartmentType {
        return this.compartmentType;
    }

    getAgeGroupIndex(): number {
        return this.ageGroupIndex;
    }
    getAgeGroupName(): string {
        return this.ageGroupName;
    }

    getStrainId(): string {
        return this.strainId;
    }

    getContinuationRatio(): IRational {
        return this.continuationRatio;
    }

}
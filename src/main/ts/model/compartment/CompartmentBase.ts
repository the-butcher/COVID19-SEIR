import { ObjectUtil } from './../../util/ObjectUtil';
import { IRational } from '../rational/IRational';
import { RationalDuration } from '../rational/RationalDuration';
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
    private readonly nrmValue: number;
    private readonly ageGroupIndex: number;
    private readonly strainId: string;

    private readonly continuationRatio: IRational;

    constructor(compartmentType: ECompartmentType, absTotal: number, absValue: number, ageGroupIndex: number, strainId: string, continuationDuration: number) {
        this.id = ObjectUtil.createId();
        this.compartmentType = compartmentType;
        this.absTotal = absTotal;
        this.nrmValue = absValue * 1.0 / this.absTotal;
        this.ageGroupIndex = ageGroupIndex;
        this.strainId = strainId;
        this.continuationRatio = new RationalDuration(continuationDuration);
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

    getNrmValue(): number {
        return this.nrmValue;
    }

    getAbsValue(): number {
        return this.nrmValue * this.absTotal;
    }

    getIncomingCompartment(): ICompartment {
        return this;
    }

    getOutgoingCompartment(): ICompartment {
        return this;
    }

    getCompartmentType(): ECompartmentType {
        return this.compartmentType;
    }

    getAgeGroupIndex(): number {
        return this.ageGroupIndex;
    }

    getStrainId(): string {
        return this.strainId;
    }

    getContinuationRatio(): IRational {
        return this.continuationRatio;
    }

}
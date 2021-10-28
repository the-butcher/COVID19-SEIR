import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { ModificationContact } from '../../../common/modification/ModificationContact';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaption } from '../IValueAdaptor';
import { IDataItem } from '../ModelStateIntegrator';
import { ValueAdaptorBase3 } from './ValueAdaptorBase3';

/**
 * parameters for ValueAdaptorMultiplier3, applicable age-group and contact category
 */
export interface IValueAdaptorMultiplierParams {
    ageGroup: AgeGroup;
    contactCategory: string;
    weightA?: number;
}

/**
 * value adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type calculates an error, with respect to a given age-group and contact-category, for a single multiplications multipliers
 */
export class ValueAdaptorMultiplier3 extends ValueAdaptorBase3 {

    private readonly contactCategory: string;
    private accountedError: number;
    private weightA: number;

    constructor(params: IValueAdaptorMultiplierParams) {
        super(params.ageGroup);
        this.contactCategory = params.contactCategory;
        this.accountedError = 0;
        this.weightA = params.weightA;
    }

    getContactCategory(): string {
        return this.contactCategory;
    }

    getError(modificationContact: ModificationContact): number {
        return modificationContact.getModificationValues().mult___errs[this.contactCategory];
    }

    setError(modificationContact: ModificationContact, error: number): number {
        return modificationContact.getModificationValues().mult___errs[this.contactCategory] = error;
    }

    adaptValues(modificationSet: IModificationSet, stepDataset: IDataItem[]): IValueAdaption {

        // const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        const errA = this.calculateErrA(modificationSet, stepDataset);

        const prevMultA = modificationSet.modA.getCategoryValue(this.contactCategory);
        const prevMultB = modificationSet.modB.getCategoryValue(this.contactCategory);

        // subtract anything that is assumed to already be accounted for
        const remainingError = errA - this.accountedError;

        // add the new error to the accounted for stack
        // this.accountedError += errA;

        const currMultA = Math.max(0.00, Math.min(1, prevMultA / (1 + remainingError * this.weightA)));

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB: prevMultB,
            errA,
            errB: 0
        }

    }

}
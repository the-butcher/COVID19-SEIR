import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { ModificationContact } from '../../../common/modification/ModificationContact';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaptorMultiplierParams } from '../fitter3/ValueAdaptorMultiplier3';
import { IValueAdaption } from '../IValueAdaptor';
import { IDataItem } from '../ModelStateIntegrator';
import { ValueAdaptorBase1 } from './ValueAdaptorBase1';

/**
 * value adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type calculates errors, with respect to a given age-group and contact-category, for two modifications multipliers
 */
export class ValueAdaptorMultiplier1 extends ValueAdaptorBase1 {

    private readonly contactCategory: string;

    constructor(params: IValueAdaptorMultiplierParams) {
        super(params.ageGroup);
        this.contactCategory = params.contactCategory;
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
        const errB = this.calculateErrB(modificationSet, stepDataset);

        const incrA = 0.005 * errA;
        const incrB = 0.010 * errB;

        this.setError(modificationSet.modA, errA);
        this.setError(modificationSet.modB, errB);

        const prevMultA = modificationSet.modA.getCategoryValue(this.contactCategory);
        const prevMultB = modificationSet.modB.getCategoryValue(this.contactCategory);
        const currMultA = Math.max(0.00, Math.min(1, prevMultA + incrA));
        const currMultB = Math.max(0.00, Math.min(1, prevMultB + incrB));

        // console.log(loggableRange, 'correct', this.contactCategory, controlVals, 'et: ', et.toFixed(4), 'mult: ', prevMultA.toFixed(4), '>>', currMultA.toFixed(4));

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB,
            errA,
            errB
        }

    }

}
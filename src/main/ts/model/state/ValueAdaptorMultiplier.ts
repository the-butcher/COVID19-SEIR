import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IModificationSet } from './ModelStateBuilder';
import { IDataItem } from './ModelStateIntegrator';
import { ValueAdaptorBase } from './ValueAdaptorBase';

export interface IValueAdaptorMultiplierParams {
    ageGroup: AgeGroup;
    contactCategory: string;
}

export class ValueAdaptorMultiplier extends ValueAdaptorBase {

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

        this.setError(modificationSet.mod0, errA);
        this.setError(modificationSet.modA, errB);

        const prevMultA = modificationSet.mod0.getCategoryValue(this.contactCategory);
        const prevMultB = modificationSet.modA.getCategoryValue(this.contactCategory);
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
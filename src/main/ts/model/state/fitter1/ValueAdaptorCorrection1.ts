import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { ModificationContact } from '../../../common/modification/ModificationContact';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaption } from '../IValueAdaptor';
import { IDataItem } from '../ModelStateIntegrator';
import { ValueAdaptorBase1 } from './ValueAdaptorBase1';

/**
 * value adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type calculates an error, with respect to a given age-group, for two multiplications corrections
 */
export class ValueAdaptorCorrection1 extends ValueAdaptorBase1 {

    constructor(ageGroup: AgeGroup) {
        super(ageGroup);
    }

    getError(modificationContact: ModificationContact): number {
        return modificationContact.getModificationValues().corr___errs['other'][this.getAgeGroup().getName()];
    }

    setError(modificationContact: ModificationContact, error: number): number {
        return modificationContact.getModificationValues().corr___errs['other'][this.getAgeGroup().getName()] = error;
    }

    adaptValues(modificationSet: IModificationSet, stepDataset: IDataItem[]): IValueAdaption {

        // const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        const errA = this.calculateErrA(modificationSet, stepDataset);
        const errB = this.calculateErrB(modificationSet, stepDataset);

        const incrA = 0.005 * errA;
        const incrB = 0.010 * errB;

        this.setError(modificationSet.modA, errA);
        this.setError(modificationSet.modB, errB);

        const prevMultA = modificationSet.modA.getCorrectionValue(this.getAgeGroup().getIndex())
        const prevMultB = modificationSet.modB.getCorrectionValue(this.getAgeGroup().getIndex())
        const currMultA = Math.max(0.20, Math.min(4, prevMultA + incrA));
        const currMultB = Math.max(0.20, Math.min(4, prevMultB + incrB));

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
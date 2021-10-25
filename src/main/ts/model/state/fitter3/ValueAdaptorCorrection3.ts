import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { ModificationContact } from '../../../common/modification/ModificationContact';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaption } from '../IValueAdaptor';
import { IDataItem } from '../ModelStateIntegrator';
import { ValueAdaptorBase3 } from './ValueAdaptorBase3';

/**
 * value adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type calculates an error, with respect to a given age-group, for a single multiplications corrections
 */
export class ValueAdaptorCorrection3 extends ValueAdaptorBase3 {

    private accountedError: number;

    constructor(ageGroup: AgeGroup) {
        super(ageGroup);
        this.accountedError = 0;
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

        const prevMultA = modificationSet.modA.getCorrectionValue('other', this.getAgeGroup().getIndex());
        const prevMultB = modificationSet.modB.getCorrectionValue('other', this.getAgeGroup().getIndex())

        // subtract anything that is assumed to already be accounted for
        const remainingError = errA - this.accountedError;

        // add the new error to the accounted for stack
        this.accountedError + errA;

        const currMultA = Math.max(0.20, Math.min(4, prevMultA + remainingError * 0.001));

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
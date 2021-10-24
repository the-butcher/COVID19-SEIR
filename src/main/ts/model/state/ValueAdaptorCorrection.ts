import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IModificationSet } from './ModelStateBuilder';
import { IDataItem } from './ModelStateIntegrator';
import { ValueAdaptorBase } from './ValueAdaptorBase';


export class ValueAdaptorCorrection extends ValueAdaptorBase {

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

        this.setError(modificationSet.mod0, errA);
        this.setError(modificationSet.modA, errB);

        const prevMultA = modificationSet.mod0.getCorrectionValue('other', this.getAgeGroup().getIndex())
        const prevMultB = modificationSet.modA.getCorrectionValue('other', this.getAgeGroup().getIndex())
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
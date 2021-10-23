import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IDataItem } from './ModelStateIntegrator';

export interface IValueAdaptorMultiplierParams {
    ageGroup: AgeGroup;
    contactCategory: string;
}

export class ValueAdaptorMultiplier implements IValueAdaptor {

    private readonly ageGroup: AgeGroup;
    private readonly contactCategory: string;

    constructor(params: IValueAdaptorMultiplierParams) {
        this.ageGroup = params.ageGroup;
        this.contactCategory = params.contactCategory;
    }

    getContactCategory(): string {
        return this.contactCategory;
    }

    calculateOffset(stepDataset: IDataItem[]): number {
        const stepDataB = stepDataset[stepDataset.length - 1];
        const casesB = StrainUtil.findCases(stepDataB, this.ageGroup);
        return (casesB.base / casesB.data) - 1;
    }

    getError(modificationContact: ModificationContact): number {
        return modificationContact.getModificationValues().mult___errs[this.contactCategory];
    }

    setError(modificationContact: ModificationContact, error: number): number {
        return modificationContact.getModificationValues().mult___errs[this.contactCategory] = error;
    }

    calculateSetpoint(modificationContactA: ModificationContact, modificationContactB: ModificationContact): number {

        return 0;
        // const baseItemA = BaseData.getInstance().findBaseDataItem(modificationContactA.getInstant());
        // const baseItemB = BaseData.getInstance().findBaseDataItem(modificationContactB.getInstant());
        // const baseItemC = BaseData.getInstance().findBaseDataItem(modificationContactB.getInstant() * 2 - modificationContactA.getInstant());

        // const deltaAB = baseItemA.getAverageCases(this.ageGroup.getIndex()) - baseItemA.getAverageCases(this.ageGroup.getIndex());
        // const deltaBC = baseItemB.getAverageCases(this.ageGroup.getIndex()) - baseItemC.getAverageCases(this.ageGroup.getIndex());
        // if (deltaAB < deltaBC) {
        //     return ModelStateBuilder.MAX_TOLERANCE;;
        // } else {
        //     return -ModelStateBuilder.MAX_TOLERANCE;;
        // }

    }

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IValueAdaption {

        // const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        // https://en.wikipedia.org/wiki/PID_controller#Industrial_control
        // const controlVals = this.getControlValues(modificationContactA); // modificationContactA.getModificationValues().mult___pids[this.contactCategory];
        // const setpoint = this.calculateSetpoint(modificationContactA, modificationContactB);

        let errA = 0;
        let errB = 0;
        let totalBase = 0;
        let totalData = 0;
        let deltaBase = 0;
        let deltaData = 0;
        for (let i = 1; i < stepDataset.length; i++) {

            const casesA = StrainUtil.findCases(stepDataset[i - 1], this.ageGroup);
            const casesB = StrainUtil.findCases(stepDataset[i], this.ageGroup);

            totalData += casesB.data * i;
            totalBase += casesB.base * i;

            deltaBase += (casesA.base - casesB.base) * i;
            deltaData += (casesA.data - casesB.data) * i;

        }
        errA -= ((totalData / totalBase) - 1);
        if (deltaBase !== 0) {
            errB += ((deltaData / deltaBase) - 1);
        }

        const incrA = 0.01 * errA;
        const incrB = 0.10 * errB;

        this.setError(modificationContactA, errA);
        this.setError(modificationContactB, errB);

        const prevMultA = modificationContactA.getCategoryValue(this.contactCategory);
        const prevMultB = modificationContactB.getCategoryValue(this.contactCategory);
        const currMultA = Math.max(0, Math.min(1, prevMultA + incrA));
        const currMultB = Math.max(0, Math.min(1, prevMultB + incrB));

        // console.log(loggableRange, 'correct', this.contactCategory, controlVals, 'et: ', et.toFixed(4), 'mult: ', prevMultA.toFixed(4), '>>', currMultA.toFixed(4));

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB
        }

    }


}
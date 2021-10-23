import { ModelStateBuilder } from './ModelStateBuilder';
import { IPidValues } from './../../common/modification/IModificationValuesContact';
import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IDataItem } from './ModelStateIntegrator';
import { BaseData } from '../basedata/BaseData';


export class ValueAdaptorCorrection implements IValueAdaptor {

    static readonly ERROR_WEIGHT_CASES = 1;
    static readonly ERROR_WEIGHT_SLOPE = 1 - ValueAdaptorCorrection.ERROR_WEIGHT_CASES;

    private readonly ageGroup: AgeGroup;

    constructor(ageGroup: AgeGroup) {
        this.ageGroup = ageGroup;
    }

    getName(): string {
        return this.ageGroup.getName();
    }

    calculateOffset(stepDataset: IDataItem[]): number {
        const stepDataB = stepDataset[stepDataset.length - 1];
        const casesB = StrainUtil.findCases(stepDataB, this.ageGroup);
        return (casesB.base / casesB.data) - 1;
    }

    getError(modificationContact: ModificationContact): number {
        return modificationContact.getModificationValues().corr___errs['other'][this.ageGroup.getName()];
    }

    setError(modificationContact: ModificationContact, error: number): number {
        return modificationContact.getModificationValues().corr___errs['other'][this.ageGroup.getName()] = error;
    }

    calculateSetpoint(modificationContactA: ModificationContact, modificationContactB: ModificationContact): number {

        return 0;
        // const baseItemA = BaseData.getInstance().findBaseDataItem(modificationContactA.getInstant());
        // const baseItemB = BaseData.getInstance().findBaseDataItem(modificationContactB.getInstant());
        // const baseItemC = BaseData.getInstance().findBaseDataItem(modificationContactB.getInstant() * 2 - modificationContactA.getInstant());

        // const deltaAB = baseItemA.getAverageCases(this.ageGroup.getIndex()) - baseItemA.getAverageCases(this.ageGroup.getIndex());
        // const deltaBC = baseItemB.getAverageCases(this.ageGroup.getIndex()) - baseItemC.getAverageCases(this.ageGroup.getIndex());
        // if (deltaAB < deltaBC) {
        //     return ModelStateBuilder.MAX_TOLERANCE;
        // } else {
        //     return -ModelStateBuilder.MAX_TOLERANCE;;
        // }

    }

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IValueAdaption {

        // const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        // https://en.wikipedia.org/wiki/PID_controller#Industrial_control
        // const controlVals = this.getControlValues(modificationContactA); // modificationContactA.getModificationValues().corr___pids['other'][this.ageGroup.getName()];
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
        errA += ((totalData / totalBase) - 1);
        if (deltaBase !== 0) {
            errB += ((deltaData / deltaBase) - 1);
        }

        const incrA = 0.2 * errA;
        const incrB = 0.2 * errB;

        this.setError(modificationContactA, errA);
        this.setError(modificationContactB, errB);

        const prevMultA = modificationContactA.getCorrectionValue('other', this.ageGroup.getIndex())
        const prevMultB = modificationContactB.getCorrectionValue('other', this.ageGroup.getIndex())
        const currMultA = Math.max(-0.20, Math.min(4, prevMultA + incrA));
        const currMultB = Math.max(-0.20, Math.min(4, prevMultB + incrB));

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB
        }

    }


}
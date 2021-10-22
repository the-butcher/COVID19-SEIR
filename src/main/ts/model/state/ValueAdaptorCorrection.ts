import { IPidValues } from './../../common/modification/IModificationValuesContact';
import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IDataItem } from './ModelStateIntegrator';


export class ValueAdaptorCorrection implements IValueAdaptor {

    static readonly ERROR_WEIGHT_CASES = 0.999;
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

    getControlValues(modificationContact: ModificationContact): IPidValues {
        return modificationContact.getModificationValues().corr___pids['other'][this.ageGroup.getName()];
    }

    calculateEp(stepDataset: IDataItem[]): number {

        // const days = stepDataset.length - 1;

        let ep = 0;
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
        ep += ((totalData / totalBase) - 1) * ValueAdaptorCorrection.ERROR_WEIGHT_CASES;
        ep += ((deltaData / deltaBase) - 1) * ValueAdaptorCorrection.ERROR_WEIGHT_SLOPE;

        return - ep; // 0 - measured

    }

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IValueAdaption {

        // const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        // https://en.wikipedia.org/wiki/PID_controller#Industrial_control
        const controlVals = this.getControlValues(modificationContactA); // modificationContactA.getModificationValues().corr___pids['other'][this.ageGroup.getName()];

        // proportional error
        const ep = this.calculateEp(stepDataset);

        // integral error
        const ei = controlVals.ei + ep; // * days;

        // derivative error
        const ed = ep - controlVals.ep; // / days;

        // overall error
        const et = controlVals.kp * ep + controlVals.ki * ei + controlVals.kd * ed; // Math.max(-1, Math.min(1, controlVals.kp * ep + controlVals.ki * ei + controlVals.kd * ed));

        // store error values for future use
        controlVals.ep = ep;
        controlVals.ei = ei;

        const prevMultA = modificationContactA.getCorrectionValue('other', this.ageGroup.getIndex())
        const prevMultB = modificationContactB.getCorrectionValue('other', this.ageGroup.getIndex())
        const currMultA = Math.max(-0.20, Math.min(4, prevMultA + et * ValueAdaptorCorrection.ERROR_WEIGHT_CASES));
        const currMultB = Math.max(-0.20, Math.min(4, (prevMultB + prevMultA + et) / 2)); //  * ValueAdaptorCorrection.ERROR_WEIGHT_SLOPE

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB
        }

    }


}
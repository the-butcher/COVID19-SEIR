import { AgeGroup } from '../../common/demographics/AgeGroup';
import { IPidValues } from '../../common/modification/IModificationValuesContact';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IDataItem } from './ModelStateIntegrator';

export interface IValueAdaptorMultiplierParams {
    ageGroup: AgeGroup;
    contactCategory: string;
}

export class ValueAdaptorMultiplier implements IValueAdaptor {

    static readonly ERROR_WEIGHT_CASES = 0.999;
    static readonly ERROR_WEIGHT_SLOPE = 1 - ValueAdaptorMultiplier.ERROR_WEIGHT_CASES;

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

    getControlValues(modificationContact: ModificationContact): IPidValues {
        return modificationContact.getModificationValues().mult___pids[this.contactCategory];
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
        ep += ((totalData / totalBase) - 1) * ValueAdaptorMultiplier.ERROR_WEIGHT_CASES;
        ep += ((deltaData / deltaBase) - 1) * ValueAdaptorMultiplier.ERROR_WEIGHT_SLOPE;

        return - ep; // 0 - measured

    }

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IValueAdaption {

        // const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        // https://en.wikipedia.org/wiki/PID_controller#Industrial_control
        const controlVals = this.getControlValues(modificationContactA); // modificationContactA.getModificationValues().mult___pids[this.contactCategory];

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

        const prevMultA = modificationContactA.getCategoryValue(this.contactCategory);
        const prevMultB = modificationContactB.getCategoryValue(this.contactCategory);
        const currMultA = Math.max(0, Math.min(1, prevMultA + et * ValueAdaptorMultiplier.ERROR_WEIGHT_CASES));
        const currMultB = Math.max(0, Math.min(1, (prevMultB + prevMultA + et) / 2)); //  * ValueAdaptorMultiplier.ERROR_WEIGHT_SLOPE

        // console.log(loggableRange, 'correct', this.contactCategory, controlVals, 'et: ', et.toFixed(4), 'mult: ', prevMultA.toFixed(4), '>>', currMultA.toFixed(4));

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB
        }

    }


}
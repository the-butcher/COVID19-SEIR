import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { ContactAdapterMultiplier } from './ContactAdapterMultiplier';
import { IDataItem } from './ModelStateIntegrator';

export interface IContactCorrection {
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}


export class ContactAdapterCorrection {

    static readonly BASELINE = 1000;

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

    adaptValues(modificationContactA: ModificationContact, modificationContactB: ModificationContact, stepDataset: IDataItem[]): IContactCorrection {

        const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        const prevMultA = modificationContactA.getCorrectionValue('other', this.ageGroup.getIndex())
        const prevMultB = modificationContactB.getCorrectionValue('other', this.ageGroup.getIndex())

        // https://en.wikipedia.org/wiki/PID_controller#Industrial_control
        const controlVals = modificationContactA.getModificationValues().corr___pids['other'][this.ageGroup.getName()];

        /**
         * proportional error
         */
        const days = stepDataset.length - 1;

        const ewc = 0.999;
        const ews = 1 - ewc;

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
        ep += ((totalData / totalBase) - 1) * ewc;
        ep += ((deltaData / deltaBase) - 1) * ews;

        ep = - ep; // 0 - measured

        // integral error
        const ei = controlVals.ei + ep; // * days;

        // derivative error
        const ed = ep - controlVals.ep; // / days;

        // overall error
        const et = controlVals.kp * ep + controlVals.ki * ei + controlVals.kd * ed; // Math.max(-1, Math.min(1, controlVals.kp * ep + controlVals.ki * ei + controlVals.kd * ed));


        // store error values for future use
        controlVals.ep = ep;
        controlVals.ei = ei;

        const currMultA = Math.max(-0.20, Math.min(4, prevMultA + et * ewc));
        const currMultB = Math.max(-0.20, Math.min(4, prevMultB + et * ews));

        return {
            prevMultA,
            currMultA,
            prevMultB,
            currMultB
        }

    }


}
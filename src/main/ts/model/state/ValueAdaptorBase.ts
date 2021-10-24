import { TimeUtil } from './../../util/TimeUtil';
import { AgeGroup } from '../../common/demographics/AgeGroup';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { StrainUtil } from '../../util/StrainUtil';
import { IValueAdaption, IValueAdaptor } from './IValueAdaptor';
import { IModificationSet } from './ModelStateBuilder';
import { IDataItem } from './ModelStateIntegrator';


export abstract class ValueAdaptorBase implements IValueAdaptor {

    private readonly ageGroup: AgeGroup;

    constructor(ageGroup: AgeGroup) {
        this.ageGroup = ageGroup;
    }

    getAgeGroup(): AgeGroup {
        return this.ageGroup;
    }

    getName(): string {
        return this.ageGroup.getName();
    }

    calculateOffset(stepDataset: IDataItem[]): number {
        const stepDataB = stepDataset[stepDataset.length - 1];
        const casesB = StrainUtil.findCases(stepDataB, this.ageGroup);
        return (casesB.base / casesB.data) - 1;
    }

    abstract getError(modificationContact: ModificationContact): number;
    abstract setError(modificationContact: ModificationContact, error: number): number;

    calculateErrA(modificationSet: IModificationSet, stepDataset: IDataItem[]): number {

        let i = 1
        for (; i < stepDataset.length; i++) {
            if (stepDataset[i].instant == modificationSet.modA.getInstant()) {
                const casesA = StrainUtil.findCases(stepDataset[i], this.ageGroup);
                return - ((casesA.data / casesA.base) - 1);
            }
        }
        console.warn('failed to find casesA', TimeUtil.formatCategoryDate(stepDataset[i].instant));
        return 0;

    }

    calculateErrB(modificationSet: IModificationSet, stepDataset: IDataItem[]): number {

        const casesB = StrainUtil.findCases(stepDataset[stepDataset.length - 1], this.ageGroup);
        return - ((casesB.data / casesB.base) - 1);

    }


    abstract adaptValues(modificationSet: IModificationSet, stepDataset: IDataItem[]): IValueAdaption;



}
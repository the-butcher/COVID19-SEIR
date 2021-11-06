import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { ModificationContact } from '../../../common/modification/ModificationContact';
import { StrainUtil } from '../../../util/StrainUtil';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaption, IValueAdaptor } from '../IValueAdaptor';
import { IDataItem } from '../ModelStateIntegrator';

/**
 * value adapter for curve multipliers or corrections
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type calculates an error, with respect to a given age-group, from the errors taken two modifications along a set of three modifications in total
 */
export abstract class ValueAdaptorBase1 implements IValueAdaptor {

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
            if (stepDataset[i].instant == modificationSet.modB.getInstant()) {
                const casesA = StrainUtil.findCases(stepDataset[i], this.ageGroup);
                return - ((casesA.data / casesA.base) - 1);
            }
        }
        console.log('failed to find casesA', TimeUtil.formatCategoryDateFull(modificationSet.modB.getInstant()), stepDataset.length);
        return 0;

    }

    calculateErrB(modificationSet: IModificationSet, stepDataset: IDataItem[]): number {

        const casesB = StrainUtil.findCases(stepDataset[stepDataset.length - 1], this.ageGroup);
        return - ((casesB.data / casesB.base) - 1);

    }

    abstract adaptValues(modificationSet: IModificationSet, stepDataset: IDataItem[]): IValueAdaption;

}
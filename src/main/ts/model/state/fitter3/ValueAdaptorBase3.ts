import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { ModificationContact } from '../../../common/modification/ModificationContact';
import { StrainUtil } from '../../../util/StrainUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaption, IValueAdaptor } from '../IValueAdaptor';
import { IDataItem } from '../ModelStateIntegrator';

/**
 * value adapter for curve multipliers or corrections
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type calculates an error, with respect to a given age-group, from the average case proportion between base-cases (real-cases) and data-cases (model-cases)
 */
export abstract class ValueAdaptorBase3 implements IValueAdaptor {

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

        let dataTotal = 0;
        let baseTotal = 0;
        for (let i = 1; i < stepDataset.length; i++) {
            const casesA = StrainUtil.findCases(stepDataset[i], this.ageGroup);
            dataTotal += casesA.data;
            baseTotal += casesA.base;
        }
        return - ((dataTotal / baseTotal) - 1);

    }

    calculateErrB(modificationSet: IModificationSet, stepDataset: IDataItem[]): number {
        return 0;
    }

    abstract adaptValues(modificationSet: IModificationSet, stepDataset: IDataItem[]): IValueAdaption;

}
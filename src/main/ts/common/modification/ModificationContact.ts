import { TimeUtil } from './../../util/TimeUtil';
import { BaseData } from '../../model/basedata/BaseData';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { ObjectUtil } from '../../util/ObjectUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IContactCategories } from './IContactCategories';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesContact } from './IModificationValuesContact';

/**
 * implementation of IModification for age-group contact matrix
 * multiple testing filters for different categories are kept as instance variable
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationContact extends AModification<IModificationValuesContact> implements IContactCategories, IContactMatrix {

    private readonly ageGroups: AgeGroup[];
    private readonly contactCategories: ContactCategory[];

    private matrixValue: number;
    private columnValues: number[];

    constructor(modificationParams: IModificationValuesContact) {

        super('RANGE', modificationParams);

        this.ageGroups = [];
        this.contactCategories = [];

        const demographics = Demographics.getInstance();
        this.ageGroups.push(...demographics.getAgeGroups());
        this.contactCategories.push(...demographics.getCategories());

        this.resetValues();

    }

    setInstants(instantA: number, instantB: number): void {
        super.setInstants(instantA, instantB);
        const baseDataItem = BaseData.getInstance().findBaseDataItem(instantA);
        if (baseDataItem) {
            const multipliers: { [K in string]: number } = {};
            const multiplierWork = baseDataItem.getAverageMobilityWork();
            if (multiplierWork) {
                multipliers['work'] = multiplierWork * 0.60;
            }
            const multiplierHome = baseDataItem.getAverageMobilityHome();
            if (multiplierHome) {
                multipliers['family'] = multiplierHome * 0.90;
            }
            this.acceptUpdate({
                multipliers
            });
        }
    }

    getCategories(): ContactCategory[] {
        return this.contactCategories;
    }

    /**
     * corrections introduced with 04.09.2021 may alter a modification and therefore the ratios -- ModificationTime may therefore have an error in its ratio calculations
     * TODO :: consider corrections for ratios in a yet to be defined way
     *
     * @param contactCategoryName
     * @returns
     */
    getCategoryValue(contactCategoryName: string): number {
        if (ObjectUtil.isEmpty(this.modificationValues.multipliers[contactCategoryName])) {
            this.modificationValues.multipliers[contactCategoryName] = 1.0;
        }
        return this.modificationValues.multipliers[contactCategoryName];
    }

    acceptUpdate(update: Partial<IModificationValuesContact>): void {
        // console.warn('update.corrections 1', update.corrections);
        update.multipliers = {...this.modificationValues.multipliers, ...update.multipliers};
        update.corrections = {...this.modificationValues.corrections, ...update.corrections};
        // console.warn('update.corrections 2', update.corrections);
        super.acceptUpdate(update);
        this.resetValues();
    }

    resetValues(): void {
        this.matrixValue = -1;
        this.columnValues = [];
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }
    }

    logSummary(ageGroupName: string): void {
        const ageGroupContact = this.ageGroups.find(g => g.getName() === ageGroupName);
        console.log('ageGroupContact', ageGroupContact);
        const summary: { [K: string]: number} = {};
        let total = 0;
        this.contactCategories.forEach(contactCategory => {
            let sum = 0;
            this.ageGroups.forEach(ageGroupParticipant => {
                sum += contactCategory.getCellValue(ageGroupContact.getIndex(), ageGroupParticipant.getIndex()) * this.getCategoryValue(contactCategory.getName());
            });
            summary[contactCategory.getName()] = sum;
            total += sum;
        });
        summary['total'] = total;
        console.log(summary);
    }

    getInstant(): number {
        return this.modificationValues.instant;
    }

    getCellValue(indexContact: number, indexParticipant: number): number {
        let value = 0;
        this.contactCategories.forEach(contactCategory => {
            let correctionContact = this.getCorrectionValue(contactCategory.getName(), indexContact);
            let correctionParticipant = this.getCorrectionValue(contactCategory.getName(), indexParticipant);
            value += contactCategory.getCellValue(indexContact, indexParticipant) * this.getCategoryValue(contactCategory.getName()) * correctionContact * correctionParticipant;
        });
        return value;
    }

    setCorrectionValue(categoryName: string, ageGroupIndex: number, correctionValue: number): void {
        if (!this.modificationValues.corrections) {
            this.modificationValues.corrections = {};
        }
        if (!this.modificationValues.corrections[categoryName]) {
            this.modificationValues.corrections[categoryName] = {};
        }
        this.modificationValues.corrections[categoryName][this.ageGroups[ageGroupIndex].getName()]
    }

    getCorrectionValue(categoryName: string, ageGroupIndex: number): number {
        if (this.modificationValues.corrections) {
            const categoryCorrections = this.modificationValues.corrections[categoryName];
            if (categoryCorrections) {
                const correctionValue = categoryCorrections[this.ageGroups[ageGroupIndex].getName()];
                if (correctionValue) {
                    return correctionValue;
                }
            }
        }
        return 1;
    }

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    getColumnSum(): number {
        return this.getMatrixSum();
    }

    getMaxColumnValue(): number {
        return Demographics.getInstance().getMaxColumnValue();
    }

    getMaxColumnSum(): number {
        return this.getMaxMatrixSum();
    }

    getCellSum(): number {
        return this.getMatrixSum();
    }

    getMatrixSum(): number {
        if (this.matrixValue < 0) {
            this.matrixValue = ContactCellsUtil.findMatrixValue(this);
        }
        return this.matrixValue;
    }

    getMaxCellValue(): number {
        return Demographics.getInstance().getMaxCellValue();
    }

    getMaxMatrixSum(): number {
        return Demographics.getInstance().getMatrixValue();
    }

}
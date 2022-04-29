import { BaseData } from '../../model/basedata/BaseData';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IContactCategories } from './IContactCategories';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesContact } from './IModificationValuesContact';
import { ModificationRegression } from './ModificationRegression';
import { ModificationResolverRegression } from './ModificationResolverRegression';
import { Modifications } from './Modifications';

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

    isReadonly(): boolean {
        return this.modificationValues.readonly;
    }

    setInstants(instantA: number, instantB: number): void {

        super.setInstants(instantA, instantB);
        const baseDataItem = BaseData.getInstance().findBaseDataItem(instantA);

        // /**
        //  * snap corrections to their regression curves
        //  */
        // const modificationRegression = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
        // if (modificationRegression) {
        //     const corrections: { [K in string]: number } = {};
        //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //         corrections[ageGroup.getName()] = modificationRegression.getCorrectionRegression(instantA, ageGroup.getName()).loess.y;
        //     });
        //     this.acceptUpdate({
        //         corrections
        //     });
        // }

        // const modificationRegression = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
        // if (modificationRegression) {

        //     // const multipliers: { [K in string]: number } = {};
        //     const corrections: { [K in string]: number } = {};

        //     // multipliers['work'] = modificationRegression.getMultiplierRegression(instantA, 'work').loess.y;
        //     // multipliers['school'] = modificationRegression.getMultiplierRegression(instantA, 'work').loess.y;
        //     // multipliers['family'] = modificationRegression.getMultiplierRegression(instantA, 'family').loess.y;
        //     // multipliers['other'] = modificationRegression.getMultiplierRegression(instantA, 'other').loess.y;
        //     // multipliers['nursing'] = modificationRegression.getMultiplierRegression(instantA, 'family').loess.y * 0.6 + modificationRegression.getMultiplierRegression(instantA, 'other').loess.y * 0.2;

        //     //     Demographics.getInstance().getCategories().forEach(category => {
        //     //         multipliers[category.getName()] = modificationRegression.getMultiplierRegression(instantA, category.getName()).loess.y;
        //     //     });
        //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //         corrections[ageGroup.getName()] = modificationRegression.getCorrectionRegression(instantA, ageGroup.getName()).loess.y;
        //     });
        //     //     console.log(TimeUtil.formatCategoryDateFull(this.modificationValues.instant), modificationRegression, multipliers, corrections);

        //     // multipliers['nursing'] = 0.7; // modificationRegression.getMultiplierRegression(instantA, 'other').loess.y;

        //     this.acceptUpdate({
        //         // multipliers,
        //         corrections
        //     });

        // }

        // if (baseDataItem) {

        //     const multipliers: { [K in string]: number } = {};

        //     /**
        //      * 1) snap to google data
        //      */

        //     // const multiplierWork = baseDataItem.getAverageMobilityWork();
        //     // const multiplierHome = baseDataItem.getAverageMobilityHome();
        //     // const multiplierOther = baseDataItem.getAverageMobilityOther();
        //     // if (multiplierWork) {
        //     //     multipliers['work'] = multiplierWork;
        //     //     multipliers['school'] = multiplierWork;
        //     // }
        //     // if (multiplierHome) {
        //     //     multipliers['family'] = multiplierHome;
        //     //     //     multipliers['nursing'] = multiplierHome * 0.5 + multiplierOther * 0.3;
        //     // }
        //     // if (multiplierOther) {
        //     //     multipliers['other'] = multiplierOther;
        //     // }

        //     // multipliers['school'] = 0.75;

        //     this.acceptUpdate({
        //         multipliers
        //     });
        // }

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

        update.multipliers = { ...this.modificationValues.multipliers, ...update.multipliers };
        update.corrections = { ...this.modificationValues.corrections, ...update.corrections };
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
        console.log(this.getColumnValueSummary(ageGroupContact));
    }

    getInstant(): number {
        return this.modificationValues.instant;
    }

    getCellValue(indexContact: number, indexParticipant: number): number {
        let value = 0;
        let correctionContact = this.getCorrectionValue(indexContact);
        let correctionParticipant = this.getCorrectionValue(indexParticipant);
        this.contactCategories.forEach(contactCategory => {
            value += contactCategory.getCellValue(indexContact, indexParticipant) * this.getCategoryValue(contactCategory.getName()) * correctionContact * correctionParticipant;
        });
        return value;
    }

    getCorrectionValue(ageGroupIndex: number): number {
        let correctionValue: number;
        if (this.modificationValues.corrections) {
            correctionValue = this.modificationValues.corrections[this.ageGroups[ageGroupIndex].getName()];
        }
        return correctionValue ? correctionValue : 1;
    }

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    getColumnValueSummary(ageGroupContact: AgeGroup): { [K in string]: number } {

        const correctionContact = this.getCorrectionValue(ageGroupContact.getIndex());
        let correctionParticipant: number;

        const summary: { [K: string]: number } = {};
        let total = 0;
        let val: number;

        this.contactCategories.forEach(contactCategory => {
            let sum = 0;
            this.ageGroups.forEach(ageGroupParticipant => {
                correctionParticipant = this.getCorrectionValue(ageGroupParticipant.getIndex());
                val = contactCategory.getCellValue(ageGroupContact.getIndex(), ageGroupParticipant.getIndex()) * this.getCategoryValue(contactCategory.getName()) * correctionContact * correctionParticipant;
                // console.log(contactCategory.getName(), ageGroupParticipant.getName(), val);
                sum += val;
            });
            // console.log(contactCategory.getName(), 'TOTAL', sum);
            summary[contactCategory.getName()] = sum;
            total += sum;
        });
        summary['total'] = total;
        console.log('TOTAL', total);
        return summary;
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
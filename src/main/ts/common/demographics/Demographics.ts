import { ModelConstants } from './../../model/ModelConstants';
import { JsonLoader } from '../../util/JsonLoader';
import { IContactCategories } from '../modification/IContactCategories';
import { AgeGroup } from './AgeGroup';
import { ContactCategory } from './ContactCategory';
import { IContactMatrixConfig } from './IContactMatrixConfig';
import { IDemographicsConfig } from './IDemographicsConfig';

/**
 * central storage of "static" model parameters, like age-groups and contact categories
 * this instance should only hold values that are not changeable through gui-interaction,
 * this way the values in this instance will not be subject ti concurrency issues in case model update is executed asynchronously at some point in the future
 *
 * @author h.fleischer
 * @since 21.05.2021
 */
export class Demographics implements IContactCategories {

    static async setInstanceFromPath(path: string): Promise<void> {
        const baseData = await new JsonLoader().load(path);
        Demographics.setInstanceFromConfig(path, baseData);
    }

    static setInstanceFromConfig(path: string, demographicsConfig: IDemographicsConfig): void {
        this.instance = new Demographics(path, demographicsConfig);
    }

    static getInstance(): Demographics {
        return this.instance;
    }

    private static instance: Demographics;

    private readonly path: string;
    /**
     * the config instance that was used to construct this instance
     */
    private readonly demographicsConfig: IDemographicsConfig;

    /**
     * absolute model total
     */
    private readonly absTotal: number;
    private ageGroups: AgeGroup[];
    private ageGroupTotal: AgeGroup;

    private contactCategories: ContactCategory[];
    private maxCellValue: number;
    private readonly columnValues: number[];
    private maxColumnValue: number;
    private matrixValue: number;

    constructor(path: string, demographicsConfig: IDemographicsConfig) {

        this.path = path;
        // console.log('done loading demographics from path', this.path, demographicsConfig);

        this.demographicsConfig = demographicsConfig;
        this.ageGroups = [];
        this.columnValues = [];

        let pN1 = 0;
        for (let ageGroupIndex = 0; ageGroupIndex < demographicsConfig.groups.length; ageGroupIndex++) {
            const ageGroupParams = demographicsConfig.groups[ageGroupIndex];
            pN1 += ageGroupParams.pG;
            this.ageGroups.push(new AgeGroup(ageGroupIndex, ageGroupParams));
        }
        this.absTotal = pN1;

        this.ageGroupTotal = new AgeGroup(this.ageGroups.length, {
            name: ModelConstants.AGEGROUP_NAME_______ALL,
            pG: this.absTotal
        });

        const contactCategoryParams: IContactMatrixConfig[] = [];
        demographicsConfig.matrices.forEach(matrixConfig => {

            const contactCategoryParamsTarget: IContactMatrixConfig = {
                name: matrixConfig.name,
                data: [],
                ageGroups: demographicsConfig.groups
            }

            /**
             * TODO test scenarios from spring (i.e. after school opening when alpha came)
             */
            let corrections: number[] = [
                1.00,
                1.00,
                1.00,
                1.00,
                1.00,
                1.00,
                1.00,
                1.00,
                1.00,
                1.00
            ];

            if (matrixConfig.name === 'school') {
                corrections = [
                    1, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1, // 55-64
                    1, // 65-74
                    1, // 75-84
                    1  // >= 85
                ].map(v => v * 1.2)
            }

            if (matrixConfig.name === 'nursing') {
                corrections = [
                    1, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1, // 55-64
                    1, // 65-74
                    1.20, // 75-84
                    1  // >= 85
                ]
            }

            if (matrixConfig.name === 'family') {
                corrections = [
                    0.70, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1, // 55-64
                    1, // 65-74
                    1, // 75-84
                    1  // >= 85
                ]
            }

            if (matrixConfig.name === 'work') {
                corrections = [
                    1, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1, // 55-64
                    1, // 65-74
                    1, // 75-84
                    1  // >= 85
                ].map(v => v * Math.sqrt(0.5))
            }

            if (matrixConfig.name === 'other') {
                corrections = [
                    0.00, // <= 04
                    0.20, // 05-14
                    1.00, // 15-24
                    1.00, // 25-34
                    1.00, // 35-44
                    1.00, // 45-54
                    1.00, // 55-64
                    1.00, // 65-74
                    1.00, // 75-84
                    1.00  // >= 85
                ].map(v => v * 2.5)
            }

            // if (matrixConfig.name === 'other') {
            //     corrections = [
            //         0.05, // <= 04
            //         0.20, // 05-14
            //         0.65, // 15-24
            //         0.80, // 25-34
            //         0.90, // 35-44
            //         1.00, // 45-54
            //         1.20, // 55-64
            //         1.00, // 65-74
            //         1.60, // 75-84
            //         1.10  // >= 85
            //     ].map(v => v * 2)
            // }

            // /**
            //  * a derivate of 'other' with proprietary scaling
            //  */
            // if (matrixConfig.name === 'risk') {
            //     corrections = [
            //         0.00, // <= 04
            //         0.05, // 05-14
            //         1.93, // 15-24
            //         1.89, // 25-34
            //         0.62, // 35-44
            //         0.04, // 45-54
            //         0.02, // 55-64
            //         0.00, // 65-74
            //         0.00, // 75-84
            //         0.00  // >= 85
            //     ].map(v => v * Math.sqrt(2.0))
            // }

            for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
                contactCategoryParamsTarget.data[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                    contactCategoryParamsTarget.data[indexContact][indexParticipant] = matrixConfig.data[indexContact][indexParticipant] * corrections[indexContact] * corrections[indexParticipant];
                }
            }

            contactCategoryParams.push(contactCategoryParamsTarget);

        });

        /**
         * calculate a value total across all categories and age groups
         */
        this.matrixValue = 0; // the total cell value in the contact matrix
        this.contactCategories = [];

        contactCategoryParams.forEach(contactCategoryParam => {
            const contactCategory = new ContactCategory(contactCategoryParam);
            this.contactCategories.push(contactCategory);
        });

        /**
         * evaluate max combined cell value
         */
        this.maxCellValue = 0;
        this.maxColumnValue = 0;
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            let colTotal = 0;
            for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                let curCombinedCellValue = 0;
                this.contactCategories.forEach(contactCategory => {
                    curCombinedCellValue += contactCategory.getCellValue(indexContact, indexParticipant);
                });
                colTotal += curCombinedCellValue;
                this.maxCellValue = Math.max(this.maxCellValue, curCombinedCellValue);
            }
            this.columnValues[indexContact] = colTotal;
            this.matrixValue += colTotal;
            this.maxColumnValue = Math.max(this.maxColumnValue, colTotal);
        };
        // console.log('this.matrixValue', this.matrixValue, this.columnValues.reduce((prev, curr) => prev + curr, 0));

    }

    getInstant(): number {
        return -1;
    }

    getPath(): string {
        return this.path;
    }

    getDemographicsConfig(): IDemographicsConfig {
        return this.demographicsConfig;
    }

    getMatrixValue(): number {
        return this.matrixValue;
    }

    getColumnValue(ageGroupIndex: number): number {
        return this.columnValues[ageGroupIndex];
    }

    getMaxColumnValue(): number {
        return this.maxColumnValue;
    }

    getMaxCellValue(): number {
        return this.maxCellValue;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }

    getAgeGroups(): AgeGroup[] {
        return this.ageGroups;
    }

    getAgeGroupsWithTotal(): AgeGroup[] {
        return [...this.ageGroups, this.ageGroupTotal];
    }

    findAgeGroupByName(ageGroup: string): AgeGroup {
        return this.ageGroups.find(g => g.getName() === ageGroup);
    }

    getCategories(): ContactCategory[] {
        return this.contactCategories;
    }

}
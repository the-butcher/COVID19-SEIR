import { JsonLoader } from '../../util/JsonLoader';
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
export class Demographics {

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
    private contactCategories: ContactCategory[];
    private maxCellTotal: number;
    private maxColTotal: number;
    private exposuresPerContact: number;
    private matrixSum: number;

    constructor(path: string, demographicsConfig: IDemographicsConfig) {

        this.path = path;
        // console.log('done loading demographics from path', this.path, demographicsConfig);

        this.demographicsConfig = demographicsConfig;
        this.ageGroups = [];

        let pN1 = 0;
        for (let ageGroupIndex = 0; ageGroupIndex < demographicsConfig.groups.length; ageGroupIndex++) {
            const ageGroupParams = demographicsConfig.groups[ageGroupIndex];
            pN1 += ageGroupParams.pG;
            this.ageGroups.push(new AgeGroup(ageGroupIndex, ageGroupParams));
        }
        this.absTotal = pN1;



        const contactCategoryParams: IContactMatrixConfig[] = [];
        demographicsConfig.matrices.forEach(contactCategoryParamsBase => {

            const contactCategoryParamsTarget: IContactMatrixConfig = {
                name: contactCategoryParamsBase.name,
                data: [],
                ageGroups: demographicsConfig.groups
            }

            /**
             * TODO test scenarios from spring (i.e. after school opening when alpha came)
             */
            let corrections: number[] = [
                1, // <= 04
                1,
                1, // 1.02,
                1,
                1,
                1,
                1, // 1.35,
                1,
                1,
                1
            ];

            if (contactCategoryParamsBase.name === 'school') {
                corrections = [
                    1.1, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1.05, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1.2, // 55-64
                    1.05, // 65-74
                    1, // 75-84
                    1  // >= 85
                ]
            }

            if (contactCategoryParamsBase.name === 'nursing') {
                corrections = [
                    1, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1.20, // 55-64
                    1.20, // 65-74
                    1.20, // 75-84
                    1  // >= 85
                ]
            }

            if (contactCategoryParamsBase.name === 'family') {
                corrections = [
                    0.75, // <= 04
                    1, // 05-14
                    0.95, // 15-24
                    1, // 25-34
                    1, // 35-44
                    1, // 45-54
                    1.15, // 55-64
                    1.1, // 65-74
                    1.1, // 75-84
                    1  // >= 85
                ]
            }

            if (contactCategoryParamsBase.name === 'work') {
                corrections = [
                    1, // <= 04
                    1, // 05-14
                    1, // 15-24
                    1, // 25-34
                    0.85, // 35-44
                    0.95, // 45-54
                    4.0, // 55-64
                    70, // 65-74
                    1, // 75-84
                    1  // >= 85
                ]
            }

            if (contactCategoryParamsBase.name === 'other') {
                corrections = [
                    0.50, // <= 04
                    1, // 05-14
                    0.9, // 15-24
                    1.5, // 25-34
                    0.85, // 35-44
                    0.80, // 45-54
                    1.00, // 55-64
                    1, // 65-74
                    1.3, // 75-84
                    1  // >= 85
                ].map(v => v / Math.sqrt(2))
            }

            if (contactCategoryParamsBase.name === 'risk') {
                corrections = [
                    0.00, // <= 04
                    0.5, // 05-14
                    2, // 15-24
                    1.7, // 25-34
                    0.5, // 35-44
                    0.1, // 45-54
                    0.05, // 55-64
                    0.0, // 65-74
                    0.0, // 75-84
                    0.0  // >= 85
                ].map(v => v * 1.4 / Math.sqrt(2))
            }

            for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
                contactCategoryParamsTarget.data[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                    let correction = corrections[indexContact];
                    if (indexContact !== indexParticipant) {
                        correction *= corrections[indexParticipant]
                    }
                    contactCategoryParamsTarget.data[indexContact][indexParticipant] = contactCategoryParamsBase.data[indexContact][indexParticipant] * correction;
                }
            }

            contactCategoryParams.push(contactCategoryParamsTarget);

        });

        /**
         * calculate a value total across all categories and age groups
         */
        // let populationContactTotal = 0;
        this.matrixSum = 0; // the total cell value in the contact matrix
        let populationG;
        this.contactCategories = [];

        contactCategoryParams.forEach(contactCategoryParam => {
            // let populationContactCategory = 0;
            let matrixSumCategory = 0;
            for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
                populationG = this.ageGroups[indexContact].getAbsValue(); // population of the "contact" age group
                for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                    // populationContactCategory += contactCategoryParam.data[indexContact][indexParticipant] * populationG;
                    matrixSumCategory += contactCategoryParam.data[indexContact][indexParticipant] * populationG;
                }
            }
            const contactCategory = new ContactCategory(contactCategoryParam);
            this.contactCategories.push(contactCategory);
            // populationContactTotal += populationContactCategory;
            this.matrixSum += matrixSumCategory;
        });


        this.exposuresPerContact = this.absTotal / this.matrixSum;

        // console.log('this.contactCategories', this.contactCategories);
        // console.log('this.exposuresPerContact', this.exposuresPerContact);

        /**
         * evaluate max combined cell value
         */
        this.maxCellTotal = 0;
        this.maxColTotal = 0;
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            let colTotal = 0;
            for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                let curCombinedCellValue = 0;
                this.contactCategories.forEach(contactCategory => {
                    curCombinedCellValue += contactCategory.getData(indexContact, indexParticipant);
                });
                colTotal += curCombinedCellValue;
                this.maxCellTotal = Math.max(this.maxCellTotal, curCombinedCellValue);
                // if (curCombinedCellValue > this.maxCellTotal) {
                //     this.maxCellTotal = curCombinedCellValue;
                // }
            }
            this.maxColTotal = Math.max(this.maxColTotal, colTotal);
        };

    }

    getPath(): string {
        return this.path;
    }

    getDemographicsConfig(): IDemographicsConfig {
        return this.demographicsConfig;
    }

    getExposuresPerContact(): number {
        return this.exposuresPerContact;
    }

    getMatrixSum(): number {
        return this.matrixSum;
    }

    getMaxColTotal(): number {
        return this.maxColTotal;
    }

    getMaxCellTotal(): number {
        return this.maxCellTotal;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }

    getAgeGroups(): AgeGroup[] {
        return this.ageGroups;
    }

    findAgeGroupByName(ageGroup: string): AgeGroup {
        return this.ageGroups.find(g => g.getName() === ageGroup);
    }

    getContactCategories(): ContactCategory[] {
        return this.contactCategories;
    }

}
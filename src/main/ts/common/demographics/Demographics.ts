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

    static setInstanceFromConfig(demographicsConfig: IDemographicsConfig): void {
        this.instance = new Demographics(demographicsConfig);
    }

    static getInstance(): Demographics {
        return this.instance;
    }

    private static instance: Demographics;

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
    private exposuresPerContact: number;
    private matrixSum: number;

    constructor(demographicsConfig: IDemographicsConfig) {

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

            for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
                contactCategoryParamsTarget.data[indexContact] = [];
                for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                    contactCategoryParamsTarget.data[indexContact][indexParticipant] = contactCategoryParamsBase.data[indexContact][indexParticipant];
                }
            }

            // for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            //     for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
            //         const sumC = contactCategoryParamsTarget.data[indexContact][indexParticipant] * this.ageGroups[indexContact].getAbsValue();
            //         const sumP = contactCategoryParamsTarget.data[indexParticipant][indexContact] * this.ageGroups[indexParticipant].getAbsValue();
            //         console.log(sumC, indexContact, contactCategoryParamsTarget.data[indexContact][indexParticipant], this.ageGroups[indexContact].getAbsValue());
            //         console.log(sumP, indexParticipant, contactCategoryParamsTarget.data[indexParticipant][indexContact], this.ageGroups[indexParticipant].getAbsValue());
            //     }
            // }

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
        this.maxCellTotal = -1;
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            for (let indexParticipant = 0; indexParticipant < this.ageGroups.length; indexParticipant++) {
                let curCombinedCellValue = 0;
                this.contactCategories.forEach(contactCategory => {
                    curCombinedCellValue += contactCategory.getData(indexContact, indexParticipant);
                });
                if (curCombinedCellValue > this.maxCellTotal) {
                    this.maxCellTotal = curCombinedCellValue;
                }
            }
        };

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

    getMaxCellTotal(): number {
        return this.maxCellTotal;
    }

    getAbsTotal(): number {
        return this.absTotal;
    }

    getAgeGroups(): AgeGroup[] {
        return this.ageGroups;
    }

    getContactCategories(): ContactCategory[] {
        return this.contactCategories;
    }

}
import { Statistics } from './../../../util/Statistics';
import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptorCorrections3 } from './ModificationAdaptorCorrections3';
import { ModificationAdaptorMultipliers3 } from './ModificationAdaptorMultipliers3';
import { randomInt } from 'crypto';

/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
 */
export class ModelStateFitter3 {

    // possibilities (TODO create profiles)
    // -- global with a fit-interval of 2 and variable weights (until variance can not be reduced any further)
    // -- local (at the end) with a fit-interval of 2 (until variance can not be reduced any further)
    // -- local (at the end) with a fit-interval of 1 (for the very last step) length - 4

    static readonly FIT_INTERVAL = 2;
    static readonly FIT___WEIGHT = 0.1;

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modelStateBuilderMultipliers = new ModificationAdaptorMultipliers3({
            ageGroup: ageGroupSchool,
            contactCategory: 'school',
            weightA: ModelStateFitter3.FIT___WEIGHT
        },{
            ageGroup: ageGroupNursing,
            contactCategory: 'nursing',
            weightA: ModelStateFitter3.FIT___WEIGHT
        },{
            ageGroup: ageGroupTotal,
            contactCategory: 'other',
            weightA: ModelStateFitter3.FIT___WEIGHT / 2
        });
        // const modelStateBuilderCorrections = new ModificationAdaptorCorrections3();

        let modificationIndex = 0; // Math.floor(Math.random() * ModelStateFitter3.FIT_INTERVAL); // modificationsContact.length - 6

        // const modificationContactOuterB = modificationsContact[modificationIndex];
        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactOuterB.getInstant())}`;
        // const stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
        //     // drop data from callback
        //     progressCallback({
        //         ratio: modelProgress.ratio
        //     });
        // });
        // console.log(loggableRange, '++', stepDataI.length);
        // dataset.push(...stepDataI);
        // modificationIndex++;

        let errorStatsMultipliers = new Statistics();


        for (; modificationIndex < modificationsContact.length - ModelStateFitter3.FIT_INTERVAL - 60; modificationIndex++) {

            const modificationContact = modificationsContact[modificationIndex];

            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter3.FIT_INTERVAL],
                ratio: 1 - modificationIndex / modificationsContact.length
            }

            let loggableRange = `${TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modB.getInstant())}`;

            const corrErrs: { [K in string]: number} = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                corrErrs[ageGroup.getName()] = 0;
            });
            modificationSet.modA.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
            });

            // wiggle other, nursing and school
            const errMultipliers = await modelStateBuilderMultipliers.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
            // const errCorrections = await modelStateBuilderCorrections.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);

            errorStatsMultipliers.addValue(errMultipliers.errA);
            dataset.push(...errMultipliers.data);
            // errorStatsCorrections.addValue(errCorrections.errA);
            // totalErrorMultipliers += errMultipliers.errA;
            // totalErrorCorrections += errCorrections.errA;

            // loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;
            // const stepDataI = await modelStateIntegrator.buildModelData(modificationContact.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            //     // drop data from callback
            //     progressCallback({
            //         ratio: modelProgress.ratio
            //     });
            // });

            console.log(loggableRange, errorStatsMultipliers.getVariance().toFixed(8).padStart(7, ' '));
            // dataset.push(...stepDataI);

        }

        // const contactValuesM2 = modificationsContact[modificationsContact.length-3].getModificationValues();
        const contactValuesM1 = modificationsContact[modificationsContact.length-2].getModificationValues();

        // const multipliers: { [K: string]: number} = {};
        // const corrections: { [K: string]: { [K: string]: number}} = {};
        // Demographics.getInstance().getCategories().forEach(category => {

        //     corrections[category.getName()] = {};

        //     const multiplierM2 = contactValuesM2.multipliers[category.getName()];
        //     const multiplierM1 = contactValuesM1.multipliers[category.getName()];
        //     multipliers[category.getName()] = multiplierM1 + (multiplierM1 - multiplierM2);

        //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //         const correctionM2 = contactValuesM2.corrections[category.getName()][ageGroup.getName()];
        //         const correctionM1 = contactValuesM1.corrections[category.getName()][ageGroup.getName()];
        //         corrections[category.getName()][ageGroup.getName()] = correctionM1 + (correctionM1 - correctionM2);
        //     });

        // })

        // console.log('lastValidContactValues', lastValidContactValues);
        modificationsContact[modificationsContact.length-1].acceptUpdate({
            multipliers: {...contactValuesM1.multipliers},
            corrections: {...contactValuesM1.corrections},
        });

        console.log('------------------------------------------------------------------------------------------');

        // modificationsContact[modificationsContact.length - 1].acceptUpdate({
        //     ...modificationsContact[modificationsContact.length - 2].getModificationValues()
        // });

        /**
         * fill rest of data
         */
        let loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(maxInstant)}`;
        const fillData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', fillData.length, errorStatsMultipliers.getVariance().toFixed(8).padStart(7, ' '));
        dataset.push(...fillData);

        return dataset;

    }

}
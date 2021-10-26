import { Statistics } from './../../../util/Statistics';
import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptorCorrections3 } from './ModificationAdaptorCorrections3';
import { ModificationAdaptorMultipliers3 } from './ModificationAdaptorMultipliers3';

/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
 */
export class ModelStateFitter3 {

    static readonly FIT_INTERVAL = 1;

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modelStateBuilderMultipliers = new ModificationAdaptorMultipliers3({
            ageGroup: ageGroupSchool,
            contactCategory: 'school',
            weightA: 0.05
        },{
            ageGroup: ageGroupNursing,
            contactCategory: 'nursing',
            weightA: 0.05,
        },{
            ageGroup: ageGroupTotal,
            contactCategory: 'other',
            weightA: 0.02
        });
        // const modelStateBuilderCorrections = new ModificationAdaptorCorrections3();

        let modificationIndex = 80; // Math.max(3, modificationsContact.length - 20);

        const modificationContactOuterB = modificationsContact[modificationIndex];
        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactOuterB.getInstant())}`;
        const stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', stepDataI.length);
        dataset.push(...stepDataI);
        console.log('------------------------------------------------------------------------------------------');

        // let totalErrorMultipliers = 0;
        // let totalErrorCorrections = 0;
        let errorStatsMultipliers = new Statistics();
        // let errorStatsCorrections = new Statistics();

        modificationIndex++;
        for (; modificationIndex < modificationsContact.length - ModelStateFitter3.FIT_INTERVAL; modificationIndex++) {

            // let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

            const modificationContact = modificationsContact[modificationIndex];

            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter3.FIT_INTERVAL]
            }

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

            loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;
            // const stepDataI = await modelStateIntegrator.buildModelData(modificationContact.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            //     // drop data from callback
            //     progressCallback({
            //         ratio: modelProgress.ratio
            //     });
            // });

            console.log(loggableRange);
            // dataset.push(...stepDataI);

        }

        console.log('------------------------------------------------------------------------------------------');

        // modificationsContact[modificationsContact.length - 1].acceptUpdate({
        //     ...modificationsContact[modificationsContact.length - 2].getModificationValues()
        // });

        /**
         * fill rest of data
         */
        loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(maxInstant)}`;
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
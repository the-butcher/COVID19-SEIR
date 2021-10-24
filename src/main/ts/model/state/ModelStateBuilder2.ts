import { Statistics } from './../../util/Statistics';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../util/TimeUtil';
import { IModificationSet, IValueAdaption } from './ModelStateBuilder';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';
import { ModificationAdaptorCorrections2 } from './ModificationAdaptorCorrections2';
import { ModificationAdaptorMultipliers2 } from './ModificationAdaptorMultipliers2';
import { IValueErrors } from './IValueAdaptor';

export class ModelStateBuilder2 {

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {


        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modelStateBuilderCorrections = new ModificationAdaptorCorrections2();
        const modelStateBuilderMultipliersA = new ModificationAdaptorMultipliers2({
            ageGroup: ageGroupSchool,
            contactCategory: 'school'
        });

        // {
        //     ageGroup: ageGroupTotal,
        //     contactCategory: 'other'
        // },{
        //     ageGroup: ageGroupNursing,
        //     contactCategory: 'nursing'
        // }

        let modificationIndex = Math.max(3, modificationsContact.length - 20); // -3 >> will adapt the last two modifications

        const modificationContactOuterB = modificationsContact[modificationIndex];
        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactOuterB.getInstant())}`;
        const stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        // console.log(loggableRange, '++', stepDataI.length);
        dataset.push(...stepDataI);
        console.log('------------------------------------------------------------------------------------------');

        let totalErrorA = 0;

        modificationIndex++;
        modificationIndex++;

        const errStatsB = new Statistics();
        for (; modificationIndex < modificationsContact.length; modificationIndex++) {

            const modificationSet: IModificationSet = {
                mod0: modificationsContact[modificationIndex - 2],
                modA: modificationsContact[modificationIndex - 1],
                modB: modificationsContact[modificationIndex]
            }
            // const modificationContactRatio = modificationIndex / (modificationsContact.length - 1);
            let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.mod0.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

            const corrErrs: { [K in string]: number} = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                corrErrs[ageGroup.getName()] = 0;
            });
            modificationSet.mod0.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
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


            const adaptResult = await modelStateBuilderMultipliersA.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
            errStatsB.addValue(adaptResult.errB);
            totalErrorA += adaptResult.errB;
            // console.log(loggableRange, adaptResult);

            // await modelStateBuilderCorrections.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);

            const stepDataI = await modelStateIntegrator.buildModelData(modificationSet.modA.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            // console.log(loggableRange, '++', stepDataI.length, errStatsB.getStandardDeviation().toFixed(4).padStart(7, ' '));
            dataset.push(...stepDataI);

        }

        console.log('------------------------------------------------------------------------------------------');

        /**
         * fill rest of data
         */
        loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(maxInstant)}`;
        const fillData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        // console.log(loggableRange, '++', fillData.length);
        dataset.push(...fillData);

        return dataset;

    }

}
import { ModelStateBuilderMultipliers } from './ModelStateBuilderMultipliers';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../util/TimeUtil';
import { IPidValues } from './../../common/modification/IModificationValuesContact';
import { ContactAdapterMultiplier } from './ContactAdapterMultiplier';
import { ModelStateBuilderCorrections } from './ModelStateBuilderCorrections';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

export class ModelStateBuilder {

    static getMaxError(...values: number[]): number {
        return Math.max(...values.map(v => Math.abs(v - 1)));
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        // console.clear();

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        // const modelState = ModelState.copy(modelStateIntegrator.getModelState());
        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modelStateBuilderCorrections = new ModelStateBuilderCorrections();
        const modelStateBuilderMultipliersA = new ModelStateBuilderMultipliers({
            ageGroup: ageGroupTotal,
            contactCategory: 'other'
        });
        const modelStateBuilderMultipliersB = new ModelStateBuilderMultipliers({
            ageGroup: ageGroupSchool,
            contactCategory: 'school'
        }, {
            ageGroup: ageGroupNursing,
            contactCategory: 'nursing'
        });

        let stepDataI: IDataItem[];
        let stepDataN: IDataItem[];

        /**
         * data up to first adaptable modification
         */
        let modificationIndexOuter = 3;
        const modificationContactOuterB = modificationsContact[modificationIndexOuter];
        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactOuterB.getInstant())}`;
        stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', stepDataI.length);
        dataset.push(...stepDataI);
        console.log('------------------------------------------------------------------------------------------');

        modificationIndexOuter++;
        for (; modificationIndexOuter < 10 /* modificationsContact.length - 1 */; modificationIndexOuter++) {

            const modificationContactA = modificationsContact[modificationIndexOuter - 1];
            const multPids: IPidValues = {
                kp: 0.10,
                ki: 0.00,
                kd: 0.00,
                ei: 0.00,
                ep: 0.00,
            };
            const corrPids: { [K in string]: IPidValues} = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                corrPids[ageGroup.getName()] = {...multPids};
            });
            modificationContactA.acceptUpdate({
                mult___pids: {
                    'school': {...multPids},
                    'nursing': {...multPids},
                    'other': {...multPids}
                },
                corr___pids: {
                    'other': {...corrPids}
                }
            });

            const modificationContactB = modificationsContact[modificationIndexOuter];

            /**
             * TODO skip modification that are within tolerance, break on modifications that are not improvable or have invalid entry tolerance
             */
            for (let baseIterationIndex = 0; baseIterationIndex < 20; baseIterationIndex++) {
                await modelStateBuilderMultipliersA.adaptValues(modelStateIntegrator, modificationContactA, modificationContactB, dataset[dataset.length - 1], progressCallback);
            }
            for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                await modelStateBuilderMultipliersB.adaptValues(modelStateIntegrator, modificationContactA, modificationContactB, dataset[dataset.length - 1], progressCallback);
            }
            for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                await modelStateBuilderCorrections.adaptValues(modelStateIntegrator, modificationContactA, modificationContactB, dataset[dataset.length - 1], progressCallback);
            }

            loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

            /**
             * final build and add to data
             */
            stepDataI = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            console.log(loggableRange, '++', stepDataI.length);
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
        console.log(loggableRange, '++', fillData.length);
        dataset.push(...fillData);

        return dataset;

    }



}
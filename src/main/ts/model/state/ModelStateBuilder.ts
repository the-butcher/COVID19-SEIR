import { ModificationAdaptorMultipliers } from './ModificationAdaptorMultipliers';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../util/TimeUtil';
import { IPidValues } from './../../common/modification/IModificationValuesContact';
import { ValueAdaptorMultiplier } from './ValueAdaptorMultiplier';
import { ModificationAdaptorCorrections } from './ModificationAdaptorCorrections';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

export interface IValueAdaption {
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}

export class ModelStateBuilder {

    static readonly MAX_TOLERANCE = 0.005;

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

        const modelStateBuilderCorrections = new ModificationAdaptorCorrections();
        const modelStateBuilderMultipliersA = new ModificationAdaptorMultipliers({
            ageGroup: ageGroupTotal,
            contactCategory: 'other'
        });
        const modelStateBuilderMultipliersB = new ModificationAdaptorMultipliers({
            ageGroup: ageGroupSchool,
            contactCategory: 'school'
        }, {
            ageGroup: ageGroupNursing,
            contactCategory: 'nursing'
        });

        /**
         * data up to first adaptable modification
         */
        let modificationIndex = 3; // Math.max(3, modificationsContact.length - 2); // -3 >> will adapt the last two modifications

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

        modificationIndex++;
        for (; modificationIndex < modificationsContact.length; modificationIndex++) {

            const modificationContactA = modificationsContact[modificationIndex - 1];
            const modificationContactB = modificationsContact[modificationIndex];
            const modificationContactRatio = modificationIndex / (modificationsContact.length - 1);
            let loggableRange = `>> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

            // console.log(loggableRange, 'A', modificationContactA.getModificationValues());

            let adaptResultA = Number.MAX_VALUE;
            let adaptResultB = Number.MAX_VALUE;
            let adaptResultC = Number.MAX_VALUE;

            const corrErrs: { [K in string]: number} = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                corrErrs[ageGroup.getName()] = 0;
            });
            modificationContactA.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
            });
            modificationContactB.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
            });

            for (let adaptIndex = 0; adaptIndex < 10; adaptIndex ++) {

                adaptResultA = Number.MAX_VALUE;
                adaptResultB = Number.MAX_VALUE;
                adaptResultC = Number.MAX_VALUE;

                for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                    adaptResultA = await modelStateBuilderMultipliersA.adapt(modelStateIntegrator, modificationContactA, modificationContactB, modificationContactRatio, dataset[dataset.length - 1], progressCallback);
                    if (Math.abs(adaptResultA) <= ModelStateBuilder.MAX_TOLERANCE) {
                        break;
                    }
                }
                for (let baseIterationIndex = 0; baseIterationIndex < 20; baseIterationIndex++) {
                    adaptResultB = await modelStateBuilderMultipliersB.adapt(modelStateIntegrator, modificationContactA, modificationContactB, modificationContactRatio, dataset[dataset.length - 1], progressCallback);
                    if (Math.abs(adaptResultB) <= ModelStateBuilder.MAX_TOLERANCE) {
                        break;
                    }
                }
                // for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                //     adaptResultC = await modelStateBuilderCorrections.adapt(modelStateIntegrator, modificationContactA, modificationContactB, modificationContactRatio, dataset[dataset.length - 1], progressCallback);
                //     adaptResultC /= 3; // allow a higher correction offset
                //     if (Math.abs(adaptResultC) <= ModelStateBuilder.MAX_TOLERANCE) {
                //         break;
                //     }
                // }

                console.log(loggableRange, adaptIndex, '>>>>>', adaptResultA.toFixed(4), adaptResultB.toFixed(4), adaptResultC.toFixed(4));
                if (![adaptResultA, adaptResultB, adaptResultC].find(a => Math.abs(a) > ModelStateBuilder.MAX_TOLERANCE)) {
                    console.log(loggableRange, -1, '-----', adaptResultA.toFixed(4), adaptResultB.toFixed(4), adaptResultC.toFixed(4))
                    break;
                }

            }

            // console.log(loggableRange, 'B', modificationContactA.getModificationValues());

            /**
             * final build of this step and add to data
             */
            const stepDataI = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            // console.log(loggableRange, '++', stepDataI.length);
            dataset.push(...stepDataI);

            if ([adaptResultA, adaptResultB, adaptResultC].find(a => Math.abs(a) > ModelStateBuilder.MAX_TOLERANCE)) {
                // dont bother with further adaption
                // break;
            }

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
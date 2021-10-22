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
        let modificationIndex = Math.max(3, modificationsContact.length - 3);
        // console.log(modificationIndex, modificationsContact.length);

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

        modificationIndex++;
        for (; modificationIndex < modificationsContact.length; modificationIndex++) {

            const modificationContactA = modificationsContact[modificationIndex - 1];
            const modificationContactB = modificationsContact[modificationIndex];
            let loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

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

            let adaptResultA = Number.MAX_VALUE;
            let adaptResultB = Number.MAX_VALUE;
            let adaptResultC = Number.MAX_VALUE;

            for (let baseIterationIndex = 0; baseIterationIndex < 20; baseIterationIndex++) {
                adaptResultA = await modelStateBuilderMultipliersA.adapt(modelStateIntegrator, modificationContactA, modificationContactB, dataset[dataset.length - 1], progressCallback);
                if (Math.abs(adaptResultA) <= 0.005) {
                    break;
                }
            }
            for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                adaptResultB = await modelStateBuilderMultipliersB.adapt(modelStateIntegrator, modificationContactA, modificationContactB, dataset[dataset.length - 1], progressCallback);
                if (Math.abs(adaptResultB) <= 0.005) {
                    break;
                }
            }
            for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                adaptResultC = await modelStateBuilderCorrections.adapt(modelStateIntegrator, modificationContactA, modificationContactB, dataset[dataset.length - 1], progressCallback);
                if (Math.abs(adaptResultC) <= 0.005) {
                    break;
                }
            }

            console.log(loggableRange, -1, '>>>>>', adaptResultA.toFixed(4), adaptResultB.toFixed(4), adaptResultC.toFixed(4));

            // none larger than tolerance, no more optimization required
            // if (![adaptResultA, adaptResultB, adaptResultC].find(a => Math.abs(a) > 0.005)) {
            //     console.log(loggableRange, -1, 'break', adaptResultA.toFixed(4), adaptResultB.toFixed(4), adaptResultC.toFixed(4))
            //     break;
            // }


            /**
             * final build and add to data
             */
            const stepDataI = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            // console.log(loggableRange, '++', stepDataI.length);
            dataset.push(...stepDataI);

            // // no further optimization on any other mods, just integrate to the end and stop
            // if ([adaptResultA, adaptResultB, adaptResultC].find(a => Math.abs(a) > 0.005)) {
            //     console.log(loggableRange, 'abort', adaptResultA.toFixed(4), adaptResultB.toFixed(4), adaptResultC.toFixed(4))
            //     break;
            // }

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
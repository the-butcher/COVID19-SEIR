import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptor6 } from './ModificationAdaptor6';

/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
 */
export class ModelStateFitter6 {

    static readonly FIT_INTERVAL = 1;

    constructor() {
        // empty
    }

    async adapt(fitterParams: IFitterParams, modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IModelProgress> {

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const modificationAdapter = new ModificationAdaptor6();

        let modificationIndexStart = 2; // modificationsContact.length - 6; // 2;

        const modificationContactOuterB = modificationsContact[modificationIndexStart];
        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactOuterB.getInstant())}`;
        const stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', stepDataI.length);
        dataset.push(...stepDataI);

        // modificationIndexStart++;

        for (let modificationIndex = modificationIndexStart; modificationIndex < modificationsContact.length - ModelStateFitter6.FIT_INTERVAL; modificationIndex ++) {

            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter6.FIT_INTERVAL],
                ratio: 1 - modificationIndex / modificationsContact.length
            }

            // if (TimeUtil.formatCategoryDate(modificationSet.modA.getInstant()) === '16.05.') {

                let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

                let iterationIndex = 0;
                let dailyerrors;
                while (iterationIndex++ < 1) {

                    dailyerrors = await modificationAdapter.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);

                    console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, dailyerrors);

                }

            // }

            const stepDataI = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            dataset.push(...stepDataI);

        }

        console.log('------------------------------------------------------------------------------------------');

        /**
         * fill rest of data
         */
        loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(maxInstant)}`;
        const fillData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio,
                fitterParams
            });
        });
        console.log(loggableRange, '++', fillData.length);
        dataset.push(...fillData);

        return {
            ratio: 1,
            data: dataset,
            fitterParams
        };

    }

}
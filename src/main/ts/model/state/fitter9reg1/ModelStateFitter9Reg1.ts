import { ModificationRegression } from '../../../common/modification/ModificationRegression';
import { Modifications } from '../../../common/modification/Modifications';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { Demographics } from './../../../common/demographics/Demographics';
import { Statistics } from './../../../util/Statistics';
import { TimeUtil } from './../../../util/TimeUtil';
import { ModelConstants } from './../../ModelConstants';


/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 *
 * leads to oscillation (runge phenomenon?) the further away it gets from origin
 *
 */
export class ModelStateFitter9Reg1 {

    static readonly FIT_INTERVAL = 1;

    async adapt(fitterParams: IFitterParams, modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IModelProgress> {

        const dataset: IDataItem[] = [];

        // find the regression modification
        const modificationRegression = Modifications.getInstance().findModificationsByType('REGRESSION').find(m => true) as ModificationRegression;
        const maxPredictionInstant = Math.min(maxInstant, modificationRegression.getInstantA() + 2 * TimeUtil.MILLISECONDS_PER___WEEK);


        let loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationRegression.getInstantA())}`;
        const prevDataset = await modelStateIntegrator.buildModelData(modificationRegression.getInstantA(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio,
                fitterParams
            });
        });
        dataset.push(...prevDataset);
        console.log(loggableRange, '++', prevDataset.length);


        // stats by day, then age group
        const predictionStats: { [K in string]: { [K in string]: Statistics }} = {};
        const incidenceKeys: Set<string> = new Set();
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            predictionStats[ageGroup.getName()] = {}; // new Statistics();
        });

        const iterations = 25;
        for (let i = 0; i < iterations; i++) {

            console.log('iteration', i);

            modificationRegression.randomize();

            modelStateIntegrator.checkpoint();
            const randomDataset = await modelStateIntegrator.buildModelData(maxPredictionInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                progressCallback({
                    ratio: modelProgress.ratio,
                    fitterParams
                });
            });
            modelStateIntegrator.rollback();

            randomDataset.forEach(randomData => {

                if (randomData.instant > (modificationRegression.getInstantA() + TimeUtil.MILLISECONDS_PER____DAY)) {

                    // be sure to have a container for this day
                    const incidenceKey = TimeUtil.formatCategoryDateFull(randomData.instant);
                    if (!incidenceKeys.has(incidenceKey)) {
                        incidenceKeys.add(incidenceKey);
                        predictionStats[incidenceKey] = {};
                    }

                    Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                        // be sure to have a container for this group within this day
                        if (!predictionStats[incidenceKey][ageGroup.getName()]) {
                            predictionStats[incidenceKey][ageGroup.getName()] = new Statistics();
                        }

                        predictionStats[incidenceKey][ageGroup.getName()].addValue(randomData.valueset[ageGroup.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL]);

                    });

                }

            });

        }

        modificationRegression.normalize();

        loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(maxInstant)}`;
        const normalizedDataset = await modelStateIntegrator.buildModelData(maxPredictionInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio,
                fitterParams
            });
        });


        /**
         * transfer prediction data to the clean, normalized data
         */
        normalizedDataset.forEach(normalizedData => {
            const incidenceKey = TimeUtil.formatCategoryDateFull(normalizedData.instant);
            if (predictionStats[incidenceKey]) {

                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                    const ageGroupStats = predictionStats[incidenceKey][ageGroup.getName()];
                    normalizedData.valueset[ageGroup.getName()].PREDICTION = {
                        avg: ageGroupStats.getAverage(),
                        std: ageGroupStats.getStandardDeviation(),
                        num: ageGroupStats.size()
                    }
                });

            }
        });

        dataset.push(...normalizedDataset);
        console.log(loggableRange, '++', normalizedDataset.length);


        // const emptyDataset = await modelStateIntegrator.emptyModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
        //     progressCallback({
        //         ratio: modelProgress.ratio,
        //         fitterParams
        //     });
        // });
        // dataset.push(...emptyDataset);

        return {
            ratio: 1,
            data: dataset,
            fitterParams
        };

    }

}
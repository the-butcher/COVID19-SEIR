import { Statistics } from './../../../util/Statistics';
import { Demographics } from './../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { TimeUtil } from './../../../util/TimeUtil';
import { ModificationAdaptor7 } from './ModificationAdaptor7';


/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 *
 * leads to oscillation (runge phenomenon?) the further away it gets from origin
 *
 */
export class ModelStateFitter7 {

    static readonly FIT_INTERVAL = 1;

    async adapt(fitterParams: IFitterParams, modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IModelProgress> {

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const modelStateBuilderMultipliers = new ModificationAdaptor7();


        /**
         * a single run to collect errors and error derivates
         */
        const modificationSet: IModificationSet = {
            modA: modificationsContact[0],
            modB: modificationsContact[modificationsContact.length - 1]
        }
        let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

        const stepData = await modelStateBuilderMultipliers.adapt(modelStateIntegrator, modificationSet, progressCallback);
        console.log(loggableRange, '++', stepData.length);
        dataset.push(...stepData);


        // setup containers, values by modification id and age group
        const pullVals: { [K in string]: { [K in string]: number } } = {};
        for (let modificationIndex = 0; modificationIndex < modificationsContact.length; modificationIndex ++) {
            pullVals[modificationsContact[modificationIndex].getId()] = {};
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                pullVals[modificationsContact[modificationIndex].getId()][ageGroup.getName()] = 0;
            });
        }

        for (let modificationIndex = 1; modificationIndex < modificationsContact.length; modificationIndex ++) {

            const modificationContact = modificationsContact[modificationIndex];
            console.log(TimeUtil.formatCategoryDate(modificationContact.getInstant()), modificationIndex);

            const minPullInstant = modificationContact.getInstant() - TimeUtil.MILLISECONDS_PER____DAY * 5;
            const maxPullInstant = modificationContact.getInstant() + TimeUtil.MILLISECONDS_PER____DAY * 5;
            const pullDataset = stepData.filter(d => d.instant >= minPullInstant && d.instant <= maxPullInstant);

            // const pullDataset = stepData.filter(d => d.instant === modificationContact.getInstant());

            pullDataset.forEach(pullData => {
                const lever = Math.abs(pullData.instant - modificationContact.getInstant()) / (TimeUtil.MILLISECONDS_PER____DAY * 5);
                console.log(Math.pow(1-lever,2));
                const weight = Math.pow(1 - lever, 2);
                // const weight = 10 / Math.pow(modificationIndex, 2);
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                    const weighedDeriv = pullData.derivs[ageGroup.getName()] * weight;
                    pullVals[modificationContact.getId()][ageGroup.getName()] = pullVals[modificationContact.getId()][ageGroup.getName()] + weighedDeriv;
                });
            });

        }

        for (let modificationIndex = 3; modificationIndex < modificationsContact.length; modificationIndex ++) {

            const modificationContact = modificationsContact[modificationIndex];
            const pullVal = pullVals[modificationContact.getId()];

            const pullData = stepData.find(d => d.instant === modificationContact.getInstant());

            const prevMultO = modificationContact.getCategoryValue('other');
            const prevMultN = modificationContact.getCategoryValue('nursing');
            const prevMultS = modificationContact.getCategoryValue('school');

            const currMultO = Math.max(0.00, Math.min(1, prevMultO / (1 + pullVal['TOTAL'] * 0.1)));
            const currMultN = Math.max(0.00, Math.min(1, prevMultN / (1 + pullVal['>= 85'] * 0.2)));
            const currMultS = Math.max(0.00, Math.min(1, prevMultS / (1 + pullVal['05-14'] * 0.2)));

            const corrections: { [K in  string]: number } = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

                const prevCorrG = modificationContact.getCorrectionValue(ageGroup.getIndex());
                const currCorrG = Math.max(0.20, Math.min(4, prevCorrG / (1 + pullVal[ageGroup.getName()] * 0.1))); // TODO try multiplication
                corrections[ageGroup.getName()] = currCorrG;

                pullData.derivs[ageGroup.getName()] = pullVal[ageGroup.getName()];
            });

            modificationContact.acceptUpdate({
                multipliers: {
                    'other': currMultO,
                    'nursing': currMultN,
                    'school': currMultS
                },
                corrections
            });

        }


        console.log('------------------------------------------------------------------------------------------');

        /**
         * fill rest of data, if any
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
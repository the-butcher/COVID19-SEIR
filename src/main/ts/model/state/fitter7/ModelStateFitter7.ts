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
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
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

        /**
         * now think of derivates as forces applied to the curve
         * these forces will act in their neighbourhood on modifications and corrections to both sides of the error
         *
         * a derivate error will want to "twist" the curve at that point, so it would i.e. reduce value on the previous modification, but increase on the following modification
         *
         * with exponential growth leverage will have a large role (try different operators)
         * keep in mind that it may be necessary to use square errors rather than plain values
         *
         * the modifications act against each other as well
         * 1) add errors to correction pool
         * 2) smooth the forces between respective modifications (or does the system take care of that anyways)
         */

        // setup containers, values by modification id and age group
        const pullVals: { [K in string]: { [K in string]: number } } = {};
        for (let modificationIndex = 0; modificationIndex < modificationsContact.length; modificationIndex ++) {
            pullVals[modificationsContact[modificationIndex].getId()] = {};
            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                pullVals[modificationsContact[modificationIndex].getId()][ageGroup.getName()] = 0;
            });
        }

        for (let modificationIndex = 0; modificationIndex < modificationsContact.length; modificationIndex ++) {

            const modificationContact = modificationsContact[modificationIndex];

            const minPullInstant = modificationContact.getInstant() - TimeUtil.MILLISECONDS_PER____DAY * 7;
            const maxPullInstant = modificationContact.getInstant() + TimeUtil.MILLISECONDS_PER____DAY * 0;
            const pullDataset = stepData.filter(d => d.instant >= minPullInstant && d.instant <= maxPullInstant);

            // const pullDataset = stepData.filter(d => d.instant === modificationContact.getInstant());

            pullDataset.forEach(pullData => {
                const weight = 1; // 1 - (Math.abs(pullData.instant - modificationContact.getInstant()) / (TimeUtil.MILLISECONDS_PER____DAY * 4));
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                    const weighedDeriv = pullData.derivs[ageGroup.getName()] * weight;
                    pullVals[modificationContact.getId()][ageGroup.getName()] = pullVals[modificationContact.getId()][ageGroup.getName()] + weighedDeriv;
                });
            });

        }

        for (let modificationIndex = 2; modificationIndex < modificationsContact.length; modificationIndex ++) {

            const modificationContact = modificationsContact[modificationIndex];
            const pullVal = pullVals[modificationContact.getId()];

            const prevMultO = modificationContact.getCategoryValue('other');
            const prevMultN = modificationContact.getCategoryValue('nursing');
            const prevMultS = modificationContact.getCategoryValue('school');

            const currMultO = Math.max(0.00, Math.min(1, prevMultO - pullVal['TOTAL'] * 0.1));
            const currMultN = Math.max(0.00, Math.min(1, prevMultN - pullVal['>= 85'] * 0.2));
            const currMultS = Math.max(0.00, Math.min(1, prevMultS - pullVal['05-14'] * 0.2));

            const corrections: { [K in string]: number } = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                const prevCorrG = modificationContact.getCorrectionValue(ageGroup.getIndex());
                const currCorrG = Math.max(0.20, Math.min(4, prevCorrG - pullVal[ageGroup.getName()] * 0.1)); // TODO try multiplication
                corrections[ageGroup.getName()] = currCorrG;
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
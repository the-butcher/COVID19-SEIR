import { Statistics } from './../../../util/Statistics';
import { Demographics } from './../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptor4 } from './ModificationAdaptor4';

/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
 */
export class ModelStateFitter4 {

    static readonly FIT_INTERVAL = 1;

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const modelStateBuilderMultipliers = new ModificationAdaptor4();

        let modificationIndex = modificationsContact.length - 6; // 2;

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

        let errorT = 0;
        let derivT = 0;

        let errorRatio = 0.00;
        let derivRatio = 0.1;

        let derivsStatsMultipliers = new Statistics();
        let errorsStatsMultipliers = new Statistics();

        modificationIndex++;
        for (; modificationIndex < modificationsContact.length - ModelStateFitter4.FIT_INTERVAL; modificationIndex ++) {

            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter4.FIT_INTERVAL],
                ratio: 1 - modificationIndex / modificationsContact.length
            }

            let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

            const errMultipliers = await modelStateBuilderMultipliers.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
            const stepData = errMultipliers.data;

            let errorO = 0;
            let derivO = 0;

            let errorN = 0;
            let derivN = 0;

            let errorS = 0;
            let derivS = 0;

            const errorsG: { [K in string]: number } = {};
            const derivsG: { [K in string]: number } = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                derivsG[ageGroup.getName()] = 0;
            });

            if (stepData[stepData.length - 1]?.derivs) {

                derivO = stepData[stepData.length - 1].derivs['TOTAL'] * derivRatio;
                derivN = stepData[stepData.length - 1].derivs['>= 85'] * derivRatio;
                derivS = stepData[stepData.length - 1].derivs['05-14'] * derivRatio;
                Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                    derivsG[ageGroup.getName()] = stepData[stepData.length - 1].derivs[ageGroup.getName()] * derivRatio;
                    derivT += derivsG[ageGroup.getName()];
                    derivsStatsMultipliers.addValue(derivsG[ageGroup.getName()]);
                });

            }
            if (stepData[stepData.length - 1]?.errors) {

                errorO = stepData[stepData.length - 1].errors['TOTAL'] * errorRatio;
                errorN = stepData[stepData.length - 1].errors['>= 85'] * errorRatio;
                errorS = stepData[stepData.length - 1].errors['05-14'] * errorRatio;
                Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                    errorsG[ageGroup.getName()] = stepData[stepData.length - 1].errors[ageGroup.getName()] * errorRatio;
                    errorT += errorsG[ageGroup.getName()];
                    errorsStatsMultipliers.addValue(errorsG[ageGroup.getName()]);
                });

            }

            const prevMultO = modificationSet.modA.getCategoryValue('other');
            const prevMultN = modificationSet.modA.getCategoryValue('nursing');
            const prevMultS = modificationSet.modA.getCategoryValue('school');

            const currMultO = Math.max(0.00, Math.min(1, prevMultO - errorO - derivO));
            const currMultN = Math.max(0.00, Math.min(1, prevMultN - errorN - derivN));
            const currMultS = Math.max(0.00, Math.min(1, prevMultS - errorS - derivS));

            const corrections: { [K in string]: number } = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                const prevCorrG = modificationSet.modA.getCorrectionValue('other', ageGroup.getIndex());
                const currCorrG = Math.max(0.20, Math.min(4, prevCorrG - errorsG[ageGroup.getName()] - derivsG[ageGroup.getName()]));
                corrections[ageGroup.getName()] = currCorrG;
                // console.log(loggableRange, 'ageGroup.getName()', TimeUtil.formatCategoryDate(modificationSet.modA.getInstant()), prevCorrG, currCorrG);
            });

            modificationSet.modA.acceptUpdate({
                multipliers: {
                    'other': currMultO,
                    'nursing': currMultN,
                    'school': currMultS
                },
                corrections: {
                    'family': {...corrections},
                    'school': {...corrections},
                    'nursing': {...corrections},
                    'work': {...corrections},
                    'other': {...corrections}
                }
            });

            dataset.push(...errMultipliers.data);



            console.log(loggableRange, '| error: ', errorT.toFixed(4).padStart(9, ' '), ' | deriv: ', derivT.toFixed(4).padStart(9, ' '));

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
        console.log(loggableRange, '++', fillData.length, errorsStatsMultipliers.getAverage().toFixed(8).padStart(12, ' '), derivsStatsMultipliers.getAverage().toFixed(8).padStart(12, ' '));
        dataset.push(...fillData);

        return dataset;

    }

}
import { Statistics } from './../../../util/Statistics';
import { Demographics } from './../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
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

    async adapt(fitterParams: IFitterParams, modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IModelProgress> {

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const modelStateBuilderMultipliers = new ModificationAdaptor4();

        let modificationIndexStart = 0; // modificationsContact.length - 6; // 2;

        const modificationContactOuterB = modificationsContact[modificationIndexStart];
        let loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationContactOuterB.getInstant())}`;
        const stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', stepDataI.length);
        dataset.push(...stepDataI);

        let errorT = 1;
        let derivT = 0;

        let errorRatio = 1; // CAREFUL, error is disabled further down
        let accumRatio = 0.0;

        let derivsStatsMultipliers = new Statistics();
        let errorsStatsMultipliers = new Statistics();

        const smoothFunction = (vM1: number, v00: number, vP1: number) => vM1 * 0.01 + v00 * 0.98 + vP1 * 0.01;

        modificationIndexStart++;
        // for (let modificationIndex = modificationIndexStart; modificationIndex < modificationsContact.length - ModelStateFitter4.FIT_INTERVAL; modificationIndex ++) {

        //     const multipliers: { [K in string]: number } = {};

        //     const multOM1 =  modificationsContact[modificationIndex - 1].getCategoryValue('other');
        //     const multO00 =  modificationsContact[modificationIndex].getCategoryValue('other');
        //     const multOP1 =  modificationsContact[modificationIndex + 1].getCategoryValue('other');
        //     multipliers['other'] = smoothFunction(multOM1, multO00, multOP1);

        //     const multNM1 =  modificationsContact[modificationIndex - 1].getCategoryValue('nursing');
        //     const multN00 =  modificationsContact[modificationIndex].getCategoryValue('nursing');
        //     const multNP1 =  modificationsContact[modificationIndex + 1].getCategoryValue('nursing');
        //     multipliers['nursing'] = smoothFunction(multNM1, multN00, multNP1);

        //     const multSM1 =  modificationsContact[modificationIndex - 1].getCategoryValue('school');
        //     const multS00 =  modificationsContact[modificationIndex].getCategoryValue('school');
        //     const multSP1 =  modificationsContact[modificationIndex + 1].getCategoryValue('school');
        //     multipliers['school'] = smoothFunction(multSM1, multS00, multSP1);

        //     const corrections: { [K in string]: number } = {};
        //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

        //         const multGM1 =  modificationsContact[modificationIndex - 1].getCorrectionValue(ageGroup.getIndex());
        //         const multG00 =  modificationsContact[modificationIndex].getCorrectionValue(ageGroup.getIndex());
        //         const multGP1 =  modificationsContact[modificationIndex + 1].getCorrectionValue(ageGroup.getIndex());
        //         corrections[ageGroup.getName()] = smoothFunction(multGM1, multG00, multGP1);

        //     });

        //     modificationsContact[modificationIndex].acceptUpdate({
        //         multipliers,
        //         corrections
        //     });

        // }

        for (let modificationIndex = modificationIndexStart; modificationIndex < modificationsContact.length - ModelStateFitter4.FIT_INTERVAL; modificationIndex ++) {

            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter4.FIT_INTERVAL],
                ratio: 1 - modificationIndex / modificationsContact.length
            }

            let loggableRange = `${TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modB.getInstant())}`;

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

            errorO = stepData[stepData.length - 1].errors['TOTAL'] * errorRatio;
            errorN = stepData[stepData.length - 1].errors['>= 85'] * errorRatio;
            errorS = stepData[stepData.length - 1].errors['05-14'] * errorRatio;
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                errorsG[ageGroup.getName()] = stepData[stepData.length - 1].errors[ageGroup.getName()] * errorRatio;
                errorT += Math.abs(errorsG[ageGroup.getName()]);
                errorsStatsMultipliers.addValue(errorsG[ageGroup.getName()]);
            });

            derivO = stepData[stepData.length - 1].derivs['TOTAL'] * fitterParams.derivRatio * 0.2;
            derivN = stepData[stepData.length - 1].derivs['>= 85'] * fitterParams.derivRatio;
            derivS = stepData[stepData.length - 1].derivs['05-14'] * fitterParams.derivRatio;
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                derivsG[ageGroup.getName()] = stepData[stepData.length - 1].derivs[ageGroup.getName()] * fitterParams.derivRatio * 0.02;
                derivT += derivsG[ageGroup.getName()];
                derivsStatsMultipliers.addValue(derivsG[ageGroup.getName()]);
            });

            let errorMax = 0;
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                errorMax = Math.max(errorMax, Math.abs(errorsG[ageGroup.getName()]));
            });
            // if (errorT < 2) {

                const prevMultO = modificationSet.modA.getCategoryValue('other');
                const prevMultN = modificationSet.modA.getCategoryValue('nursing');
                const prevMultS = modificationSet.modA.getCategoryValue('school');

                // const currMultO = Math.max(0.00, Math.min(1, prevMultO - errorO - derivO));
                // const currMultN = Math.max(0.00, Math.min(1, prevMultN - errorN - derivN));
                // const currMultS = Math.max(0.00, Math.min(1, prevMultS - errorS - derivS));

                const currMultO = Math.max(0.00, Math.min(1, prevMultO - derivO));
                const currMultN = Math.max(0.00, Math.min(1, prevMultN - derivN));
                const currMultS = Math.max(0.00, Math.min(1, prevMultS - derivS));

                const corrections: { [K in string]: number } = {};
                Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                    const prevCorrG = modificationSet.modA.getCorrectionValue(ageGroup.getIndex());
                    // const currCorrG = Math.max(0.20, Math.min(4, prevCorrG - errorsG[ageGroup.getName()] - derivsG[ageGroup.getName()]));
                    const currCorrG = Math.max(0.20, Math.min(4, prevCorrG - derivsG[ageGroup.getName()]));
                    corrections[ageGroup.getName()] = currCorrG;
                    // console.log(loggableRange, 'ageGroup.getName()', TimeUtil.formatCategoryDate(modificationSet.modA.getInstant()), prevCorrG, currCorrG);
                });

                if (modificationIndex > modificationIndexStart) {

                    modificationSet.modA.acceptUpdate({
                        multipliers: {
                            'other': currMultO,
                            'nursing': currMultN,
                            'school': currMultS
                        },
                        corrections: {...corrections}
                    });

                }

                dataset.push(...errMultipliers.data);

                console.log(modificationIndex.toString().padStart(2, '0'), '|', loggableRange, '| error: ', errorT.toFixed(4).padStart(9, ' '), ' | deriv: ', derivT.toFixed(4).padStart(9, ' '));

            // } else {
            //     dataset.push(...errMultipliers.data);
            //     break;
            // }


        }

        console.log('------------------------------------------------------------------------------------------');

        const errorTotalRatio = errorT / fitterParams.errorTLast;
        if (errorTotalRatio > 0) {
            // fitterParams.derivRatio = fitterParams.derivRatio - 0.01;
        } else {
            // fitterParams.derivRatio = fitterParams.derivRatio + 0.01;
        }
        fitterParams.errorTLast = errorT;


        /**
         * fill rest of data
         */
        loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(maxInstant)}`;
        const fillData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio,
                fitterParams
            });
        });
        console.log(loggableRange, '++', fillData.length, errorsStatsMultipliers.getAverage().toFixed(8).padStart(12, ' '), derivsStatsMultipliers.getAverage().toFixed(8).padStart(12, ' '), 'derivRatio', fitterParams.derivRatio.toFixed(4).padStart(7, ' '));
        dataset.push(...fillData);

        return {
            ratio: 1,
            data: dataset,
            fitterParams
        };

    }

}
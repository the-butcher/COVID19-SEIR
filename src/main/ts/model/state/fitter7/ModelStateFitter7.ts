import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { IDataCompare } from './../../../util/StrainUtil';
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

        // let providerOfDataItem: (dataItem: IDataItem, ageGroup: AgeGroup) => IDataCompare = StrainUtil.findCases;

        for (let modificationIndexA = modificationIndexStart; modificationIndexA < modificationsContact.length - 1; modificationIndexA ++) {

            const modificationIndexB = Math.min(modificationIndexA + 12, modificationsContact.length - 1);
            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndexA],
                modB: modificationsContact[modificationIndexB],
            }

            let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

            const stepData = await modelStateBuilderMultipliers.adapt(modelStateIntegrator, modificationSet, progressCallback);

            // setup containers, values by modification id and age group
            const pullVals: { [K in string]: { [K in string]: number } } = {};
            for (let modificationIndex2 = modificationIndexA + 1; modificationIndex2 < modificationIndexB; modificationIndex2 ++) {
                pullVals[modificationsContact[modificationIndex2].getId()] = {};
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                    pullVals[modificationsContact[modificationIndex2].getId()][ageGroup.getName()] = 0;
                });
            }

            // find the stored derivate and apply with a weight
            for (let modificationIndex2 = modificationIndexA + 1; modificationIndex2 < modificationIndexB; modificationIndex2 ++) {

                const modificationContact = modificationsContact[modificationIndex2];

                const pullData = stepData.find(d => d.instant === modificationContact.getInstant() - TimeUtil.MILLISECONDS_PER____DAY * 0);

                const weight = (Math.cos((modificationIndex2 - modificationIndexA - 1) / 10 * Math.PI) + 1) / 2;
                Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
                    const weighedDeriv = Math.pow(pullData.derivs[ageGroup.getName()], 2) * Math.sign(pullData.derivs[ageGroup.getName()]) * weight;
                    pullVals[modificationContact.getId()][ageGroup.getName()] = pullVals[modificationContact.getId()][ageGroup.getName()] + weighedDeriv;
                });

            }

            for (let modificationIndex2 = modificationIndexA + 1; modificationIndex2 < modificationIndexB; modificationIndex2 ++) {

                const modificationContact = modificationsContact[modificationIndex2];

                const pullVal = pullVals[modificationContact.getId()];

                const prevMultO = modificationContact.getCategoryValue('other');
                const prevMultN = modificationContact.getCategoryValue('nursing');
                const prevMultS = modificationContact.getCategoryValue('school');

                const currMultO = Math.max(0.00, Math.min(1, prevMultO / (1 + pullVal['TOTAL'] * 1)));
                const currMultN = Math.max(0.00, Math.min(1, prevMultN / (1 + pullVal['>= 85'] * 2)));
                const currMultS = Math.max(0.00, Math.min(1, prevMultS / (1 + pullVal['05-14'] * 2)));

                const corrections: { [K in string]: number } = {};
                Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                    const prevCorrG = modificationContact.getCorrectionValue(ageGroup.getIndex());
                    const currCorrG = Math.max(0.20, Math.min(4, prevCorrG / (1 + pullVal[ageGroup.getName()] * 1))); // TODO try multiplication
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

            const modificationN = modificationsContact[modificationIndexA + 1];
            const stepDataI = await modelStateIntegrator.buildModelData(modificationN.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            console.log(loggableRange, '++', stepDataI.length);
            dataset.push(...stepDataI);

        }

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





        // const blockCount = 1;
        // const blockSize = Math.floor(modificationsContact.length / blockCount);
        // console.log('blockCount', blockCount, blockSize);

        // for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {

        //     let modificationIndexA = blockIndex * blockSize + fitterParams.fitter7Idx;
        //     const modificationIndexB = modificationIndexA + 10;

        //     const modA = modificationsContact[modificationIndexA % modificationsContact.length];
        //     const modB = modificationsContact[modificationIndexB % modificationsContact.length];
        //     console.log(TimeUtil.formatCategoryDate(modA.getInstant()), ' -- ', TimeUtil.formatCategoryDate(modB.getInstant()))
        //     for (; modificationIndexA < modificationIndexB; modificationIndexA ++) {

        //         const modificationContact = modificationsContact[modificationIndexA % modificationsContact.length];

        //         const pullVal = pullVals[modificationContact.getId()];

        //         const prevMultO = modificationContact.getCategoryValue('other');
        //         const prevMultN = modificationContact.getCategoryValue('nursing');
        //         const prevMultS = modificationContact.getCategoryValue('school');

        //         const currMultO = Math.max(0.00, Math.min(1, prevMultO / (1 + pullVal['TOTAL'] * 1)));
        //         const currMultN = Math.max(0.00, Math.min(1, prevMultN / (1 + pullVal['>= 85'] * 2)));
        //         const currMultS = Math.max(0.00, Math.min(1, prevMultS / (1 + pullVal['05-14'] * 2)));

        //         const corrections: { [K in string]: number } = {};
        //         Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //             const prevCorrG = modificationContact.getCorrectionValue(ageGroup.getIndex());
        //             const currCorrG = Math.max(0.20, Math.min(4, prevCorrG / (1 + pullVal[ageGroup.getName()] * 1))); // TODO try multiplication
        //             corrections[ageGroup.getName()] = currCorrG;
        //         });

        //         modificationContact.acceptUpdate({
        //             multipliers: {
        //                 'other': currMultO,
        //                 'nursing': currMultN,
        //                 'school': currMultS
        //             },
        //             corrections
        //         });

        //     }

        // }


        console.log('------------------------------------------------------------------------------------------', fitterParams.fitter7Idx);

        // pass back increased index
        fitterParams.fitter7Idx = fitterParams.fitter7Idx + 1;

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
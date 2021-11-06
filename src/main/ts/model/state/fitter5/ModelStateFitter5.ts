import { IDataCompare } from './../../../util/StrainUtil';
import { AgeGroup } from './../../../common/demographics/AgeGroup';
import { BaseData } from './../../basedata/BaseData';
import { Regression } from './../../regression/Regression';
import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptor5 } from './ModificationAdaptor5';
import { isConstructSignatureDeclaration } from 'typescript';
import { StrainUtil } from '../../../util/StrainUtil';

/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
 */
export class ModelStateFitter5 {

    static readonly FIT_INTERVAL = 1;

    constructor() {
        // empty
    }

    async adapt(fitterParams: IFitterParams, modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IModelProgress> {

        const dataset: IDataItem[] = [];
        const modificationResolver = new ModificationResolverContact();
        const modificationsContact = modificationResolver.getModifications();

        const modificationAdapter = new ModificationAdaptor5();

        let modificationIndexStart = 3; // modificationsContact.length - 6; // 2;

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

        let providerOfDataItem: (dataItem: IDataItem, ageGroup: AgeGroup) => IDataCompare = StrainUtil.findCases;


        for (let modificationIndex = modificationIndexStart; modificationIndex < modificationsContact.length - ModelStateFitter5.FIT_INTERVAL; modificationIndex ++) {

            const ratio = (modificationIndex + 2) / modificationsContact.length;
            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter5.FIT_INTERVAL],
                ratio
            }

            // for the very last modification this creates faked values along an age-group wise local prediction
            // more sophisticated and based on the last available values
            // if (ratio === 1) {
            //     providerOfDataItem = (dataItem: IDataItem, ageGroup: AgeGroup) => {
            //         const modItemA = BaseData.getInstance().findBaseDataItem(modificationSet.modA.getInstant()); // find the item at posA
            //         const modItem0 = BaseData.getInstance().findBaseDataItem(modificationSet.modA.getInstant() - (modificationSet.modB.getInstant() - modificationSet.modA.getInstant()))
            //         const avgCaseA = modItemA.getAverageCases(ageGroup.getIndex());
            //         const avgCase0 = modItem0.getAverageCases(ageGroup.getIndex());
            //         // console.log(ageGroup.getName(), avgCaseA + (avgCaseA - avgCase0))
            //         return {
            //             base: avgCaseA + (avgCaseA - avgCase0),
            //             data: dataItem.valueset[ageGroup.getName()].CASES
            //         }
            //     };
            // }

            let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

            const maxAbsErrorViolationsAllowed = 10;
            const maxAbsErrorTolerance = 0.015; // 0.5%

            let maxAbsErrorLast = Number.MAX_VALUE;
            let maxAbsErrorGroup: string;
            let maxAbsErrorViolations = 0;
            let iterationIndex = 0;
            let violationIgnoreGroups: Set<string> = new Set();

            while (!modificationSet.modA.isReadonly()) { //

                const valueErrors = await modificationAdapter.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], iterationIndex++, providerOfDataItem, progressCallback);
                let maxAbsErrorCurr = 0;
                Object.keys(valueErrors).forEach(key => {
                    // dont consider ignore groups for max error
                    if (Math.max(Math.abs(valueErrors[key])) > maxAbsErrorCurr && !violationIgnoreGroups.has(key)) {
                        maxAbsErrorCurr = Math.max(Math.abs(valueErrors[key]));
                        maxAbsErrorGroup = key;
                    }
                });


                if (maxAbsErrorCurr < maxAbsErrorLast && iterationIndex < 100) {

                    // if there was improvement
                    maxAbsErrorViolations = 0;
                    maxAbsErrorLast = maxAbsErrorCurr;

                    if (maxAbsErrorCurr <= maxAbsErrorTolerance) {
                        console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, 'success ...');
                        break;
                    } else {
                        console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, '...');
                        continue;
                    }

                } else {

                    // no improvement or not enough improvement

                    maxAbsErrorViolations++;
                    maxAbsErrorLast = maxAbsErrorCurr;

                    if (maxAbsErrorViolations >= maxAbsErrorViolationsAllowed) {

                        violationIgnoreGroups.add(maxAbsErrorGroup);
                        if (violationIgnoreGroups.size >= 3) {
                            // single group allowed to be violation
                            // too many ignore groups already
                            console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, 'aborting ...');
                            break;
                        } else {
                            console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, 'ignoring ...');
                            continue;
                        }

                    } else {
                        console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup,  maxAbsErrorViolationsAllowed - maxAbsErrorViolations, 'more attempts');
                        continue;
                    }

                }

            }

            // console.log(modificationIndex.toString().padStart(2, '0'), '|', loggableRange);

            const stepDataI = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            dataset.push(...stepDataI);

            if (iterationIndex > 10) {
                break;
            }

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
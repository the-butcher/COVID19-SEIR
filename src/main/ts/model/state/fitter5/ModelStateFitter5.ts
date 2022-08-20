import { DateAxisDataItem } from '@amcharts/amcharts4/charts';
import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { ModificationResolverStrain } from '../../../common/modification/ModificationResolverStrain';
import { StrainUtil } from '../../../util/StrainUtil';
import { TimeUtil } from '../../../util/TimeUtil';
import { BaseData } from '../../basedata/BaseData';
import { ModelConstants } from '../../ModelConstants';
import { ModelInstants } from '../../ModelInstants';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptor5 } from './ModificationAdaptor5';

/**
 * model-fitter trying to lay an already pre-fitted curve on the averaged model's base curve
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type iterates forth an back in specific, i.e. 7 day steps, then from the ratio between the average offset of that interval calculates corrections and multipliers
 */
export class ModelStateFitter5 {

    static readonly ERROR_TOLERANCES: number[] = [
        0.4,
        0.3,
        0.25,
        0.20,
        0.18,
        0.16,
        0.15,
        0.14,
        0.13,
        0.12,
        0.11,
        0.10,
        0.095,
        0.090,
        0.085,
        0.080,
        0.075,
        0.070,
        0.065,
        0.060,
        0.055,
        0.050,
        0.045,
        0.040,
        0.0375,
        0.0350,
        0.0325,
        0.0300,
        0.0275,
        0.0250,
        0.0230,
        0.0220,
        0.0210,
        0.0200
    ] // 0.17, 0.14, 0.12, 0.10, 0.08, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045, 0.04, 0.035, 0.03, 0.025, 0.020, 0.017, 0.014, 0.012, 0.010];

    static readonly FIT_INTERVAL = 1;

    constructor() {
        // empty
    }

    async adapt(fitterParams: IFitterParams, modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IModelProgress> {

        const dataset: IDataItem[] = [];
        const modificationResolver = new ModificationResolverContact();
        const modificationsContact = modificationResolver.getModifications();

        let nxtErrorTolerance: number;
        for (let i = 0; i < ModelStateFitter5.ERROR_TOLERANCES.length; i++) {
            if (ModelStateFitter5.ERROR_TOLERANCES[i] <= fitterParams.curErrorCalculate) {
                nxtErrorTolerance = ModelStateFitter5.ERROR_TOLERANCES[i];
                break;
            }
        }

        if (nxtErrorTolerance && nxtErrorTolerance < fitterParams.maxErrorTolerance) {
            console.log(`error-tolerance max: ${fitterParams.maxErrorTolerance.toFixed(4)}, last: ${fitterParams.curErrorCalculate.toFixed(4)}, adjusting from ${fitterParams.maxErrorTolerance.toFixed(4)} to ${nxtErrorTolerance.toFixed(4)}`);
            fitterParams.maxErrorTolerance = nxtErrorTolerance;
        } else if (nxtErrorTolerance) {
            console.log(`error-tolerance max: ${fitterParams.maxErrorTolerance.toFixed(4)}, last: ${fitterParams.curErrorCalculate.toFixed(4)}, continuing with ${fitterParams.maxErrorTolerance.toFixed(4)} ...`);
        } else {
            console.log(`error-tolerance max: ${fitterParams.maxErrorTolerance.toFixed(4)}, last: ${fitterParams.curErrorCalculate.toFixed(4)}, reached adjustment limit!`);
        }

        const modificationAdapter = new ModificationAdaptor5();

        let modificationIndexStart = 1; // modificationsContact.length - 6; // 2;

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

        fitterParams.curErrorCalculate = -1;
        let modificationIndex = modificationIndexStart;
        for (; modificationIndex < modificationsContact.length - ModelStateFitter5.FIT_INTERVAL; modificationIndex++) {

            const ratio = (modificationIndex + 2) / modificationsContact.length;
            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter5.FIT_INTERVAL],
                ratio
            }

            let loggableRange = `${TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modB.getInstant())}`;

            const maxAbsErrorViolationsAllowed = 10;
            const maxAbsErrorTolerance = fitterParams.maxErrorTolerance; // 0.04; // 0.5%
            const maxViolatableGroupCount = 1;

            let maxAbsErrorLast = Number.MAX_VALUE;
            let maxAbsErrorGroup: string;
            let maxAbsErrorViolations = 0;
            let iterationIndex = 0;
            let violationIgnoreGroups: Set<string> = new Set();


            while (!modificationSet.modA.isReadonly()) { //

                const valueErrors = await modificationAdapter.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], iterationIndex++, progressCallback);
                let maxAbsErrorCurr = 0;
                Object.keys(valueErrors).forEach(key => {
                    // dont consider ignore groups for max error
                    if (Math.max(Math.abs(valueErrors[key])) > maxAbsErrorCurr && !violationIgnoreGroups.has(key)) {
                        maxAbsErrorCurr = Math.max(Math.abs(valueErrors[key]));
                        maxAbsErrorGroup = key;
                    }
                });

                if (maxAbsErrorCurr > fitterParams.curErrorCalculate) {
                    fitterParams.curErrorCalculate = maxAbsErrorCurr;
                    fitterParams.currDateCalculate = TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant());
                }



                if (maxAbsErrorCurr < maxAbsErrorLast && iterationIndex < 100) {

                    // if there was improvement
                    maxAbsErrorViolations = 0;
                    maxAbsErrorLast = maxAbsErrorCurr;

                    const extraTolerance = iterationIndex > 1 ? 0.99 : 1.00;
                    if (maxAbsErrorCurr <= maxAbsErrorTolerance * extraTolerance) {
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
                        if (violationIgnoreGroups.size > maxViolatableGroupCount) {

                            // single group allowed to be violated
                            // too many ignore groups already
                            console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, 'aborting ...');
                            break;

                        } else {

                            console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, 'ignoring ...');
                            continue;

                        }

                    } else {
                        console.log(iterationIndex.toString().padStart(4, '0'), '|', loggableRange, maxAbsErrorCurr.toFixed(4).padStart(7, ' '), maxAbsErrorGroup, maxAbsErrorViolationsAllowed - maxAbsErrorViolations, 'more attempts');
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

            // if there was a few iterations only, continue forward
            if (iterationIndex > 10) {
                break;
            }

        }

        const modificationsStrain = new ModificationResolverStrain().getModifications();
        const instantD1 = TimeUtil.parseCategoryDateFull("31.12.2021");
        const dataItemD1 = dataset.find(d => d.instant === instantD1);

        const casesDelta31122021 = dataItemD1.valueset[ModelConstants.AGEGROUP_NAME_______ALL].CASES[modificationsStrain[0].getId()];
        console.log('delta cases at 31.12.2021', casesDelta31122021);


        // if (modificationIndex === modificationsContact.length - 1) {
        //     const lastModification = modificationsContact[modificationsContact.length - 1];
        //     const lastValidInstant = BaseData.getInstance().getLastValidInstant();
        //     modelStateIntegrator.checkpoint();
        //     const stepData = await modelStateIntegrator.buildModelData(lastValidInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
        //         progressCallback({
        //             ratio: modelProgress.ratio // drop data from callback
        //         });
        //     });
        //     const dataItem = dataset[dataset.length - 1];
        //     const baseData = BaseData.getInstance().findBaseDataItem(dataItem.instant);
        //     const errorsO: { [K in string]: number } = {};
        //     const errorsG: { [K in string]: number } = {};
        //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //         const baseCases = baseData.getCasesM1(ageGroup.getIndex());
        //         const dataCases = dataItem.valueset[ageGroup.getName()].CASES * BaseData.getInstance().getAverageOffset(ageGroup.getIndex(), dataItem.instant);
        //         const error = dataCases - baseCases;
        //         errorsO[ageGroup.getName()] = error * stepData.length; // allow each step to carry on the error on the last modification
        //         errorsG[ageGroup.getName()] = 0;
        //     });
        //     console.log('errorsO', errorsO);
        //     stepData.forEach(dataItem => {
        //         const baseData = BaseData.getInstance().findBaseDataItem(dataItem.instant);
        //         Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //             const baseCases = baseData.getCasesM1(ageGroup.getIndex());
        //             const dataCases = dataItem.valueset[ageGroup.getName()].CASES * BaseData.getInstance().getAverageOffset(ageGroup.getIndex(), dataItem.instant);
        //             const error = dataCases - baseCases;
        //             errorsG[ageGroup.getName()] = errorsG[ageGroup.getName()] + error;
        //         });
        //     });
        //     const corrections: { [K in string]: number } = {};
        //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
        //         const ageGroupError = errorsG[ageGroup.getName()] - errorsO[ageGroup.getName()];
        //         if (ageGroupError > 0) {
        //             corrections[ageGroup.getName()] = lastModification.getCorrectionValue(ageGroup.getIndex()) - 0.003;
        //         } else if (ageGroupError < 0) {
        //             corrections[ageGroup.getName()] = lastModification.getCorrectionValue(ageGroup.getIndex()) + 0.003;
        //         }
        //         console.log(ageGroup.getName(), ageGroupError);
        //     });
        //     lastModification.acceptUpdate({
        //         corrections: { ...corrections }
        //     });
        //     modelStateIntegrator.rollback();
        // }

        // const modificationSet: IModificationSet = {
        //     modA: modificationsContact[modificationsContact.length - 2],
        //     modB: modificationsContact[modificationsContact.length - 1],
        //     ratio: 1
        // }
        // modificationSet.modB.acceptUpdate({
        //     multipliers: {
        //         // 'other': currMultO,
        //         // 'nursing': modificationSet.modA.getModificationValues().multipliers['nursing'],
        //         // 'school': modificationSet.modA.getModificationValues().multipliers['school'],
        //     },
        //     corrections: {
        //         ...modificationSet.modA.getModificationValues().corrections
        //     }
        // });


        console.log('------------------------------------------------------------------------------------------');

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
        console.log(loggableRange, '++', fillData.length);
        dataset.push(...fillData);

        console.log('==========================================================================================');

        return {
            ratio: 1,
            data: dataset,
            fitterParams
        };

    }

}
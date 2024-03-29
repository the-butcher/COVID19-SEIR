import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IFitterParams, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptor6 } from './ModificationAdaptor6';

/**
 * model-fitter trying find a good for the end of the model curve
 * @author h.fleischer
 * @since 27.04.2022
 *
 */
export class ModelStateFitter6 {

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
        for (let i = 0; i < ModelStateFitter6.ERROR_TOLERANCES.length; i++) {
            if (ModelStateFitter6.ERROR_TOLERANCES[i] <= fitterParams.curErrorCalculate) {
                nxtErrorTolerance = ModelStateFitter6.ERROR_TOLERANCES[i];
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

        const modificationAdapter = new ModificationAdaptor6();

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
        for (; modificationIndex < modificationsContact.length - ModelStateFitter6.FIT_INTERVAL; modificationIndex++) {

            const ratio = (modificationIndex + 2) / modificationsContact.length;
            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex],
                modB: modificationsContact[modificationIndex + ModelStateFitter6.FIT_INTERVAL],
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

        const modificationSet: IModificationSet = {
            modA: modificationsContact[modificationsContact.length - 2],
            modB: modificationsContact[modificationsContact.length - 1],
            ratio: 1
        }
        modificationSet.modB.acceptUpdate({
            multipliers: {
                // 'other': currMultO,
                // 'nursing': modificationSet.modA.getModificationValues().multipliers['nursing'],
                // 'school': modificationSet.modA.getModificationValues().multipliers['school'],
            },
            corrections: {
                ...modificationSet.modA.getModificationValues().corrections
            }
        });


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
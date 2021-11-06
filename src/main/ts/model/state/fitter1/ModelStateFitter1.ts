import { Demographics } from '../../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueErrors } from '../IValueAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ModificationAdaptorCorrections1 } from './ModificationAdaptorCorrections1';
import { ModificationAdaptorMultipliers1 } from './ModificationAdaptorMultipliers1';

/**
 * model-fitter trying to estimate corrections and multipliers for a set of 3-modification
 * @author h.fleischer
 * @since 25.10.2021
 *
 * the algorithm currently implements leads to oscillation in data after a few steps
 * results must be post-processes to be usable
 */
export class ModelStateFitter1 {

    static readonly MAX_TOLERANCE_A = 0.005;
    static readonly MAX_TOLERANCE_B = 0.010;
    static readonly MAX_TOLERANCE_C = 0.020;

    static getMaxError(...values: number[]): number {
        return Math.max(...values.map(v => Math.abs(v - 1)));
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        // console.clear();

        const dataset: IDataItem[] = [];
        const modificationsContact = new ModificationResolverContact().getModifications();

        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modelStateBuilderCorrections = new ModificationAdaptorCorrections1();
        const modelStateBuilderMultipliersA = new ModificationAdaptorMultipliers1({
            ageGroup: ageGroupTotal,
            contactCategory: 'other'
        });
        const modelStateBuilderMultipliersB = new ModificationAdaptorMultipliers1({
            ageGroup: ageGroupSchool,
            contactCategory: 'school'
        }, {
            ageGroup: ageGroupNursing,
            contactCategory: 'nursing'
        });

        /**
         * data up to first adaptable modification
         */
        let modificationIndex = Math.max(3, modificationsContact.length - 4); // -3 >> will adapt the last two modifications

        const modificationContactOuterB = modificationsContact[modificationIndex];
        let loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationContactOuterB.getInstant())}`;
        const stepDataI = await modelStateIntegrator.buildModelData(modificationContactOuterB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', stepDataI.length);
        dataset.push(...stepDataI);
        console.log('------------------------------------------------------------------------------------------');

        modificationIndex++;
        modificationIndex++;
        for (; modificationIndex < modificationsContact.length; modificationIndex++) {

            const modificationSet: IModificationSet = {
                modA: modificationsContact[modificationIndex - 2],
                modB: modificationsContact[modificationIndex - 1],
                modC: modificationsContact[modificationIndex]
            }
            let loggableRange = `${TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modB.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modC.getInstant())}`;

            let adaptResultA: IValueErrors;
            let adaptResultB: IValueErrors;
            let adaptResultC: IValueErrors;
            let isWithinToleranceA: boolean;
            let isWithinToleranceB: boolean;
            let isWithinToleranceC: boolean;

            const corrErrs: { [K in string]: number} = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
                corrErrs[ageGroup.getName()] = 0;
            });
            modificationSet.modA.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
            });
            modificationSet.modB.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
            });

            const adaptCount = modificationIndex === modificationsContact.length - 1 ? 5 : 1;

            if (adaptCount > 1) {
                console.log('------------------------------------------------------------------------------------------');
            }

            for (let adaptIndex = 0; adaptIndex < adaptCount; adaptIndex ++) {

                for (let baseIterationIndex = 0; baseIterationIndex < 5; baseIterationIndex++) {
                    adaptResultA = await modelStateBuilderMultipliersA.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
                    isWithinToleranceA = this.isWithinTolerance(adaptResultA, ModelStateFitter1.MAX_TOLERANCE_A);
                    if (isWithinToleranceA) {
                        break;
                    }
                }
                for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                    adaptResultB = await modelStateBuilderMultipliersB.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
                    isWithinToleranceB = this.isWithinTolerance(adaptResultB, ModelStateFitter1.MAX_TOLERANCE_B);
                    if (isWithinToleranceB) {
                        break;
                    }
                }
                for (let baseIterationIndex = 0; baseIterationIndex < 20; baseIterationIndex++) {
                    adaptResultC = await modelStateBuilderCorrections.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
                    isWithinToleranceC = this.isWithinTolerance(adaptResultC, ModelStateFitter1.MAX_TOLERANCE_C);
                    if (isWithinToleranceC) {
                        break;
                    }
                }

                let toleranceIndicator = '';
                toleranceIndicator += isWithinToleranceA ? 'XX' : '--';
                toleranceIndicator += isWithinToleranceB ? 'XX' : '--';
                toleranceIndicator += isWithinToleranceC ? 'XX' : '--';

                console.log(loggableRange, adaptIndex, '|', toleranceIndicator, '|', adaptResultA.errA.toFixed(4).padStart(7, ' '), adaptResultA.errB.toFixed(4).padStart(7, ' '), '|', adaptResultB.errA.toFixed(4).padStart(7, ' '), adaptResultB.errB.toFixed(4).padStart(7, ' '), '|', adaptResultC.errA.toFixed(4).padStart(7, ' '), adaptResultC.errB.toFixed(4).padStart(7, ' '));

            }

            /**
             * final build of this step and add to data
             */
            const stepDataI = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            console.log(loggableRange, '++', stepDataI.length);
            dataset.push(...stepDataI);

        }

        console.log('------------------------------------------------------------------------------------------');

        /**
         * fill rest of data
         */
        loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(maxInstant)}`;
        const fillData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        console.log(loggableRange, '++', fillData.length);
        dataset.push(...fillData);

        return dataset;

    }

    isWithinTolerance(valueErrors: IValueErrors, tolerance: number): boolean {
        return Math.abs(valueErrors.errA) <= tolerance && Math.abs(valueErrors.errB) <= tolerance;
    }

}
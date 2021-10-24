import { ModificationAdaptorMultipliers } from './ModificationAdaptorMultipliers';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../util/TimeUtil';
import { IPidValues } from './../../common/modification/IModificationValuesContact';
import { ValueAdaptorMultiplier } from './ValueAdaptorMultiplier';
import { ModificationAdaptorCorrections } from './ModificationAdaptorCorrections';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { IValueErrors } from './IValueAdaptor';

export interface IValueAdaption {
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}

export interface IModificationSet {
    mod0: ModificationContact;
    modA: ModificationContact;
    modB: ModificationContact;
}

export class ModelStateBuilder {

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

        // const modelState = ModelState.copy(modelStateIntegrator.getModelState());
        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modelStateBuilderCorrections = new ModificationAdaptorCorrections();
        const modelStateBuilderMultipliersA = new ModificationAdaptorMultipliers({
            ageGroup: ageGroupTotal,
            contactCategory: 'other'
        });
        const modelStateBuilderMultipliersB = new ModificationAdaptorMultipliers({
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
        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactOuterB.getInstant())}`;
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
                mod0: modificationsContact[modificationIndex - 2],
                modA: modificationsContact[modificationIndex - 1],
                modB: modificationsContact[modificationIndex]
            }
            // const modificationContactRatio = modificationIndex / (modificationsContact.length - 1);
            let loggableRange = `${TimeUtil.formatCategoryDate(modificationSet.mod0.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modB.getInstant())}`;

            // console.log(loggableRange, 'A', modificationContactA.getModificationValues());

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
            modificationSet.mod0.acceptUpdate({
                mult___errs: {
                    'school': 0,
                    'nursing': 0,
                    'other': 0
                },
                corr___errs: {
                    'other': {...corrErrs}
                }
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

            const adaptCount = modificationIndex === modificationsContact.length - 1 ? 5 : 1;

            if (adaptCount > 1) {
                console.log('------------------------------------------------------------------------------------------');
            }

            for (let adaptIndex = 0; adaptIndex < adaptCount; adaptIndex ++) {

                for (let baseIterationIndex = 0; baseIterationIndex < 5; baseIterationIndex++) {
                    adaptResultA = await modelStateBuilderMultipliersA.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
                    isWithinToleranceA = this.isWithinTolerance(adaptResultA, ModelStateBuilder.MAX_TOLERANCE_A);
                    if (isWithinToleranceA) {
                        break;
                    }
                }
                for (let baseIterationIndex = 0; baseIterationIndex < 10; baseIterationIndex++) {
                    adaptResultB = await modelStateBuilderMultipliersB.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
                    isWithinToleranceB = this.isWithinTolerance(adaptResultB, ModelStateBuilder.MAX_TOLERANCE_B);
                    if (isWithinToleranceB) {
                        break;
                    }
                }
                for (let baseIterationIndex = 0; baseIterationIndex < 20; baseIterationIndex++) {
                    adaptResultC = await modelStateBuilderCorrections.adapt(modelStateIntegrator, modificationSet, dataset[dataset.length - 1], progressCallback);
                    isWithinToleranceC = this.isWithinTolerance(adaptResultC, ModelStateBuilder.MAX_TOLERANCE_C);
                    if (isWithinToleranceC) {
                        break;
                    }
                }

                let toleranceIndicator = '';
                toleranceIndicator += isWithinToleranceA ? 'XX' : '--';
                toleranceIndicator += isWithinToleranceB ? 'XX' : '--';
                toleranceIndicator += isWithinToleranceC ? 'XX' : '--';

                console.log(loggableRange, adaptIndex, '|', toleranceIndicator, '|', adaptResultA.errA.toFixed(4).padStart(7, ' '), adaptResultA.errB.toFixed(4).padStart(7, ' '), '|', adaptResultB.errA.toFixed(4).padStart(7, ' '), adaptResultB.errB.toFixed(4).padStart(7, ' '), '|', adaptResultC.errA.toFixed(4).padStart(7, ' '), adaptResultC.errB.toFixed(4).padStart(7, ' '));

                // if (![adaptResultA, adaptResultB, adaptResultC].find(a => Math.abs(a) > ModelStateBuilder.MAX_TOLERANCE)) {
                //     console.log(loggableRange, adaptIndex, '-----', adaptResultA.toFixed(4), adaptResultB.toFixed(4), adaptResultC.toFixed(4))
                //     break;
                // }

            }

            // console.log(loggableRange, 'B', modificationContactA.getModificationValues());

            /**
             * final build of this step and add to data
             */
            const stepDataI = await modelStateIntegrator.buildModelData(modificationSet.modA.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                // drop data from callback
                progressCallback({
                    ratio: modelProgress.ratio
                });
            });
            // console.log(loggableRange, '++', stepDataI.length);
            dataset.push(...stepDataI);

            // if ([adaptResultA, adaptResultB, adaptResultC].find(a => Math.abs(a) > ModelStateBuilder.MAX_TOLERANCE)) {
            //     // dont bother with further adaption
            //     // break;
            // }

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
        // console.log(loggableRange, '++', fillData.length);
        dataset.push(...fillData);

        return dataset;

    }

    isWithinTolerance(valueErrors: IValueErrors, tolerance: number): boolean {
        return Math.abs(valueErrors.errA) <= tolerance && Math.abs(valueErrors.errB) <= tolerance;
    }




}
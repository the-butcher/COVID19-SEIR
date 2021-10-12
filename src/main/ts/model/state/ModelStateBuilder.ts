import { Demographics } from '../../common/demographics/Demographics';
import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
import { TimeUtil } from '../../util/TimeUtil';
import { ContactAdapter } from './ContactAdapter';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

export class ModelStateBuilder {

    private static readonly MAX_TOLERANCE = 0.005;

    static getMaxError(...values: number[]): number {
        return Math.max(...values.map(v => Math.abs(v - 1)));
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        const dataset: IDataItem[] = [];

        // const modelState = ModelState.copy(modelStateIntegrator.getModelState());
        const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
        const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
        const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

        const modificationsContact = new ModificationResolverContact().getModifications();

        for (let modificationIndex = 1; modificationIndex < modificationsContact.length - 1; modificationIndex++) {

            const modificationContactA = modificationsContact[modificationIndex];
            const modificationContactB = modificationsContact[modificationIndex + 1];
            const contactAdapter = new ContactAdapter(modificationContactA, modificationContactB);
            // console.log('building from', TimeUtil.formatCategoryDate(modificationContactA.getInstant()));

            let stepData: IDataItem[] = [];

            let maxIterations = 50;
            let curIterations = 0;

            let maxMultiplierError: number;
            let maxCorrectionError: number;

            // let lastCasesRatioSchool: number;
            // let lastCasesRatioNursing: number;
            // let lastCasesRatioOther: number;

            while (true) {

                // console.log('integrating from', TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant()));
                stepData = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
                    // drop data from callback
                    progressCallback({
                        ratio: modelProgress.ratio
                    });
                });

                if (stepData && stepData.length > 0 && dataset.length > 0) { //  && modificationIndex == modificationsContact.length - 2

                    // console.log('building from', TimeUtil.formatCategoryDate(modificationContactA.getInstant()));

                    const dataItemA0 = dataset[dataset.length - 1];
                    const slopeData = [...dataset, ...stepData];
                    const dataItemB0 = slopeData[slopeData.length - 1];

                    const multiplierSchool = contactAdapter.calculateMultiplier('school', ageGroupSchool, dataItemA0, dataItemB0);
                    const multiplierNursing = contactAdapter.calculateMultiplier('nursing', ageGroupNursing, dataItemA0, dataItemB0);
                    const multiplierOther = contactAdapter.calculateMultiplier('other', ageGroupTotal, dataItemA0, dataItemB0);

                    maxMultiplierError = ModelStateBuilder.getMaxError(multiplierSchool.casesRatioB, multiplierNursing.casesRatioB, multiplierOther.casesRatioB);

                    if (curIterations < maxIterations) {

                        if (maxMultiplierError > ModelStateBuilder.MAX_TOLERANCE && modificationContactA.isAdaptMultipliers()) { // do multipliers

                            // console.log(TimeUtil.formatCategoryDate(modificationContactA.getInstant()), 'nursing', multiplierNursing);

                            const multipliers: { [K: string]: number } = {};
                            if (Math.abs(multiplierSchool.casesRatioB - 1) > ModelStateBuilder.MAX_TOLERANCE) {
                                multipliers['school'] = multiplierSchool.currMultA;
                            }
                            if (Math.abs(multiplierNursing.casesRatioB - 1) > ModelStateBuilder.MAX_TOLERANCE) {
                                multipliers['nursing'] = multiplierNursing.currMultA;
                            }
                            if (Math.abs(multiplierOther.casesRatioB - 1) > ModelStateBuilder.MAX_TOLERANCE) {
                                multipliers['other'] = multiplierOther.currMultA;
                            }

                            modificationContactA.acceptUpdate({
                                multipliers
                            });
                            if (modificationIndex >= modificationsContact.length - 2) {
                                modificationContactB.acceptUpdate({
                                    multipliers
                                });
                            }

                            modelStateIntegrator.rollback();

                        } else { // do corrections

                            // console.log('within error tolerance (multipliers) or not adaptable', TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
                            modificationContactA.acceptUpdate({
                                adaptMultipliers: false
                            });

                            const correctionsOther: { [K: string]: number } = {};
                            const correctionErrors: number[] = [];
                            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

                                const ageGroupCorrections = contactAdapter.calculateCorrection(ageGroup, dataItemA0, dataItemB0);
                                correctionsOther[ageGroup.getName()] = ageGroupCorrections.currMultA;
                                correctionErrors.push(ageGroupCorrections.casesRatioB);
                                // console.log(TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ageGroup.getName(), ageGroupCorrections);

                            });

                            maxCorrectionError = ModelStateBuilder.getMaxError(...correctionErrors);
                            // console.log('maxCorrectionError', maxCorrectionError);
                            if (maxCorrectionError > ModelStateBuilder.MAX_TOLERANCE && modificationContactA.isAdaptCorrections()) {

                                // console.log(TimeUtil.formatCategoryDate(modificationContactA.getInstant()), correctionsOther);
                                const corrections = {
                                    'family': correctionsOther,
                                    'school': correctionsOther,
                                    'nursing': correctionsOther,
                                    'work': correctionsOther,
                                    'other': correctionsOther
                                }

                                modificationContactA.acceptUpdate({
                                    corrections
                                });
                                if (modificationIndex >= modificationsContact.length - 2) {
                                    modificationContactB.acceptUpdate({
                                        corrections
                                    });
                                }

                                modelStateIntegrator.rollback();

                            } else {

                                modificationContactA.acceptUpdate({
                                    adaptCorrections: false
                                });

                                // within correction tolerance --> modification done --> add a flag so it is excluded from further adaption
                                // console.log('within error tolerance (corrections) or not adaptable', TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
                                curIterations = maxIterations;
                                break;

                            } // curCorrError > maxError

                        } // curMultiError > maxError

                    } else {

                        console.clear();
                        console.log('iterations exceeded', 'maxMultiplierError', maxMultiplierError.toFixed(4), 'maxCorrectionError', maxCorrectionError?.toFixed(4), TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
                        break;

                    }

                } else {

                    // console.log('no step data', stepData, TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
                    break;

                }

                curIterations++;

            }

            // console.log('adding step data', stepData.length, TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
            dataset.push(...stepData);
            // console.log('------------------------------');

        }

        const stepData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        // console.log('adding step data', stepData.length);
        dataset.push(...stepData);

        return dataset;

    }

}
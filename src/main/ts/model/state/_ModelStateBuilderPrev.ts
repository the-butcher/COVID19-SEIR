// import { Demographics } from '../../common/demographics/Demographics';
// import { ModificationResolverContact } from '../../common/modification/ModificationResolverContact';
// import { TimeUtil } from '../../util/TimeUtil';
// import { ContactAdapter } from './ContactAdapter';
// import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

// export class ModelStateBuilder_prev {

//     private static readonly MAX_MULTIPLIER_TOLERANCE = 0.005;
//     private static readonly MAX_CORRECTION_TOLERANCE = 0.010;

//     private static readonly MIN_______BASE_ITERATION = 5;

//     static getMaxError(...values: number[]): number {
//         return Math.max(...values.map(v => Math.abs(v - 1)));
//     }

//     async adapt(modelStateIntegrator: ModelStateIntegrator, maxInstant: number, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

//         const dataset: IDataItem[] = [];

//         // const modelState = ModelState.copy(modelStateIntegrator.getModelState());
//         const ageGroupSchool = Demographics.getInstance().getAgeGroupSchool();
//         const ageGroupNursing = Demographics.getInstance().getAgeGroupNursing();
//         const ageGroupTotal = Demographics.getInstance().getAgeGroupTotal();

//         const modificationsContact = new ModificationResolverContact().getModifications();

//         let maxMultiplierErrorTotal = 0;

//         for (let modificationIndex = 1; modificationIndex < modificationsContact.length - 1; modificationIndex++) {

//             const modificationContactA = modificationsContact[modificationIndex];
//             const modificationContactB = modificationsContact[modificationIndex + 1];
//             const contactAdapter = new ContactAdapter(modificationContactA, modificationContactB);
//             // console.log('building from', TimeUtil.formatCategoryDate(modificationContactA.getInstant()));

//             let stepData: IDataItem[] = [];

//             let maxIterations = 50;
//             let curIterations = 0;

//             let maxMultiplierError: number;
//             let maxCorrectionError: number;

//             while (true) {

//                 // console.log('integrating from', TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant()));
//                 stepData = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
//                     // drop data from callback
//                     progressCallback({
//                         ratio: modelProgress.ratio
//                     });
//                 });

//                 if (stepData && stepData.length > 0 && dataset.length > 0) { //  && modificationIndex == modificationsContact.length - 2

//                     // first (reference) data-item
//                     const referenceData = dataset[dataset.length - 1];
//                     const stepDataset = [referenceData, ...stepData]

//                     // const slopeData = [...dataset, ...stepData];
//                     // const dataItemB0 = slopeData[slopeData.length - 1];

//                     const multiplierSchool = contactAdapter.calculateMultiplier('school', ageGroupSchool, stepDataset, 35);
//                     const multiplierNursing = contactAdapter.calculateMultiplier('nursing', ageGroupNursing, stepDataset, 35);
//                     const multiplierOther = contactAdapter.calculateMultiplier('other', ageGroupTotal, stepDataset, 15);

//                     // console.log('multiplierSchool', multiplierSchool);

//                     maxMultiplierError = ModelStateBuilder.getMaxError(multiplierSchool.totalRatio, multiplierNursing.totalRatio, multiplierOther.totalRatio);
//                     maxMultiplierErrorTotal += maxMultiplierError;

//                     if (curIterations < maxIterations) {

//                         const adaptMultipliers = modificationContactA.isAdaptMultipliers() || curIterations < ModelStateBuilder.MIN_______BASE_ITERATION;
//                         if (maxMultiplierError > ModelStateBuilder.MAX_MULTIPLIER_TOLERANCE && adaptMultipliers) { // do multipliers

//                             // console.log(TimeUtil.formatCategoryDate(modificationContactA.getInstant()), 'nursing', multiplierNursing);

//                             const multipliersA: { [K: string]: number } = {};
//                             const multipliersB: { [K: string]: number } = {};
//                             if (Math.abs(multiplierSchool.totalRatio - 1) > ModelStateBuilder.MAX_MULTIPLIER_TOLERANCE) {
//                                 multipliersA['school'] = multiplierSchool.currMultA;
//                                 multipliersB['school'] = multiplierSchool.currMultB;
//                             }
//                             if (Math.abs(multiplierNursing.totalRatio - 1) > ModelStateBuilder.MAX_MULTIPLIER_TOLERANCE) {
//                                 multipliersA['nursing'] = multiplierNursing.currMultA;
//                                 multipliersB['nursing'] = multiplierNursing.currMultB;
//                             }
//                             if (Math.abs(multiplierOther.totalRatio - 1) > ModelStateBuilder.MAX_MULTIPLIER_TOLERANCE) {
//                                 multipliersA['other'] = multiplierOther.currMultA;
//                                 multipliersB['other'] = multiplierOther.currMultB;
//                             }

//                             modificationContactA.acceptUpdate({
//                                 multipliers: multipliersA
//                             });
//                             // if (modificationIndex >= modificationsContact.length - 2) {
//                                 modificationContactB.acceptUpdate({
//                                     multipliers: multipliersB
//                                 });
//                             // }

//                             modelStateIntegrator.rollback();

//                         } else { // do corrections

//                             // console.log('within error tolerance (multipliers) or not adaptable', TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
//                             modificationContactA.acceptUpdate({
//                                 adaptMultipliers: false
//                             });

//                             const correctionsOtherA: { [K: string]: number } = {};
//                             const correctionsOtherB: { [K: string]: number } = {};
//                             const correctionErrors: number[] = [];
//                             Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

//                                 const ageGroupCorrections = contactAdapter.calculateCorrection(ageGroup, stepDataset);
//                                 correctionsOtherA[ageGroup.getName()] = ageGroupCorrections.currMultA;
//                                 correctionsOtherB[ageGroup.getName()] = ageGroupCorrections.currMultB;
//                                 correctionErrors.push(ageGroupCorrections.totalRatio);

//                                 // if (ageGroup.getName() === '05-14') {
//                                 //     console.log('ageGroupCorrections', ageGroupCorrections);
//                                 // }


//                                 // console.log(TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ageGroup.getName(), ageGroupCorrections);

//                             });

//                             maxCorrectionError = ModelStateBuilder.getMaxError(...correctionErrors);
//                             // console.log('maxCorrectionError', maxCorrectionError);

//                             const adaptCorrections = modificationContactA.isAdaptCorrections() || curIterations < ModelStateBuilder.MIN_______BASE_ITERATION;
//                             if (maxCorrectionError > ModelStateBuilder.MAX_CORRECTION_TOLERANCE && adaptCorrections) {

//                                 // console.log(TimeUtil.formatCategoryDate(modificationContactA.getInstant()), correctionsOther);
//                                 const correctionsA = {
//                                     'family': correctionsOtherA,
//                                     'school': correctionsOtherA,
//                                     'nursing': correctionsOtherA,
//                                     'work': correctionsOtherA,
//                                     'other': correctionsOtherA
//                                 };
//                                 const correctionsB = {
//                                     'family': correctionsOtherB,
//                                     'school': correctionsOtherB,
//                                     'nursing': correctionsOtherB,
//                                     'work': correctionsOtherB,
//                                     'other': correctionsOtherB
//                                 };

//                                 modificationContactA.acceptUpdate({
//                                     corrections: correctionsA
//                                 });
//                                 // if (modificationIndex >= modificationsContact.length - 2) {
//                                     modificationContactB.acceptUpdate({
//                                         corrections: correctionsB
//                                     });
//                                 // }

//                                 modelStateIntegrator.rollback();

//                             } else {

//                                 modificationContactA.acceptUpdate({
//                                     adaptCorrections: false
//                                 });

//                                 // within correction tolerance --> modification done --> add a flag so it is excluded from further adaption
//                                 // console.log('within error tolerance (corrections) or not adaptable', TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
//                                 curIterations = maxIterations;
//                                 break;

//                             } // curCorrError > maxError

//                         } // curMultiError > maxError

//                     } else {

//                         // console.clear();
//                         // console.log('iterations exceeded', 'maxMultiplierError', maxMultiplierError.toFixed(4), 'maxCorrectionError', maxCorrectionError?.toFixed(4), TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
//                         break;

//                     }

//                 } else {

//                     // console.log('no step data', stepData, TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
//                     break;

//                 }

//                 curIterations++;

//             }

//             const loggableRange = `${TimeUtil.formatCategoryDate(modificationContactA.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;
//             const loggableMultiplierError = maxMultiplierError ? maxMultiplierError.toFixed(4) : '------';
//             const loggableCorrectionError = maxCorrectionError ? maxCorrectionError.toFixed(4) : '------';
//             console.log(loggableRange, 'multiplierError', loggableMultiplierError, 'maxCorrectionError', loggableCorrectionError);

//             // console.log('adding step data', stepData.length, TimeUtil.formatCategoryDate(modificationContactA.getInstant()), ' >> ', TimeUtil.formatCategoryDate(modificationContactB.getInstant()));
//             dataset.push(...stepData);

//         }

//         console.log('maxMultiplierErrorTotal', maxMultiplierErrorTotal?.toFixed(4));
//         console.log('------------------------------------------------------------------------------------------');

//         const stepData = await modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
//             progressCallback({
//                 ratio: modelProgress.ratio
//             });
//         });
//         // console.log('adding step data', stepData.length);
//         dataset.push(...stepData);

//         return dataset;

//     }

// }
import { Demographics } from '../../../common/demographics/Demographics';
import { StrainUtil } from '../../../util/StrainUtil';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationSet } from '../fitter/IModificationSet';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';



/**
 * modification adapter for curve multipliers
 * @author h.fleischer
 * @since 27.04.2022
 *
 */
export class ModificationAdaptor6 {

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, iterationIndex: number, progressCallback: (progress: IModelProgress) => void): Promise<{ [K in string]: number }> {

        let loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });

        const errorRatio = 0.02;

        const errorsG: { [K in string]: number } = {};
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            const cases = StrainUtil.findCases(stepData[stepData.length - 1], ageGroup);
            const error = cases.base != 0 ? (cases.data / cases.base) - 1 : 0;
            errorsG[ageGroup.getName()] = error;
            if (!error) {
                Math.random();
            }
        });

        const prevMultO = modificationSet.modA.getCategoryValue('other');
        const prevMultN = modificationSet.modA.getCategoryValue('nursing');
        const prevMultS = modificationSet.modA.getCategoryValue('school');

        // if (!errorsG['TOTAL']) {
        //     Math.random();
        // }

        const corrections: { [K in string]: number } = {};
        let currCorrT = 0;
        const ageGropups = Demographics.getInstance().getAgeGroups();
        ageGropups.forEach(ageGroup => {
            const prevCorrG = modificationSet.modA.getCorrectionValue(ageGroup.getIndex());
            const currCorrG = Math.max(0.01, Math.min(4, prevCorrG - errorsG[ageGroup.getName()] * errorRatio * 1.00));
            corrections[ageGroup.getName()] = currCorrG;
            currCorrT += currCorrG;
        });
        const currCorrT1 = 1; // 1 + ((1 - currCorrT / ageGropups.length) * 0.3);
        // console.log(TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant()), currCorrT / ageGropups.length, currCorrT1);

        // currMultO *= currCorrT1;
        const currMultO = Math.max(0.00, Math.min(1, (prevMultO - errorsG['TOTAL'] * errorRatio * 0.30) / currCorrT1));
        const currMultN = Math.max(0.00, Math.min(1, prevMultN - errorsG['>= 85'] * errorRatio * 0.28 - errorsG['75-84'] * errorRatio * 0.12));
        const currMultS = Math.max(0.00, Math.min(1, prevMultS - errorsG['05-14'] * errorRatio * 0.40));


        if (iterationIndex % 10 < 3) {

            modificationSet.modA.acceptUpdate({
                multipliers: {
                    // 'other': currMultO,
                    // 'nursing': currMultN,
                    // 'school': currMultS
                }
            });
            // if (modificationSet.ratio === 1) {
            //     modificationSet.modB.acceptUpdate({
            //         multipliers: {
            //             'other': currMultO,
            //             'nursing': currMultN,
            //             'school': currMultS
            //         }
            //     });
            // }

        } else {

            modificationSet.modA.acceptUpdate({
                corrections: { ...corrections }
            });
            // if (modificationSet.ratio === 1) {
            //     modificationSet.modB.acceptUpdate({
            //         corrections: {...corrections}
            //     });
            // }

        }


        modelStateIntegrator.rollback();

        return errorsG;

    }



}
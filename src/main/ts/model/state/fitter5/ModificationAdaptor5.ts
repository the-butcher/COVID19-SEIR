import { IDataCompare } from './../../../util/StrainUtil';
import { Demographics } from '../../../common/demographics/Demographics';
import { AgeGroup } from '../../../common/demographics/AgeGroup';
import { StrainUtil } from '../../../util/StrainUtil';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationAdaptor } from '../fitter/IModificationAdaptor';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueErrors } from '../IValueAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';



/**
 * modification adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type updates curve multipliers, from the errors produced by 1-n value-adaptors
 * multipliers are applied to the first modification in a modification set assumed to exist from a starting modification and an ending modification
 */
export class ModificationAdaptor5 {

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, iterationIndex: number, providerOfDataCompare: (dataItem: IDataItem, ageGroup: AgeGroup) => IDataCompare , progressCallback: (progress: IModelProgress) => void): Promise<{ [K in string]: number}> {

        let loggableRange = `${TimeUtil.formatCategoryDateFull(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDateFull(modificationSet.modA.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });

        const errorRatio = 0.04;

        const errorsG: { [K in string]: number } = {};
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            const cases = providerOfDataCompare(stepData[stepData.length - 1], ageGroup); //  StrainUtil.findCases(stepData[stepData.length - 1], ageGroup);
            const error = cases.base != 0 ? (cases.data / cases.base) - 1 : 0;
            errorsG[ageGroup.getName()] = error;
        });

        const prevMultO = modificationSet.modA.getCategoryValue('other');
        const prevMultN = modificationSet.modA.getCategoryValue('nursing');
        const prevMultS = modificationSet.modA.getCategoryValue('school');

        const currMultO = Math.max(0.00, Math.min(1, prevMultO - errorsG['TOTAL'] * errorRatio * 0.75));
        const currMultN = Math.max(0.00, Math.min(1, prevMultN - errorsG['>= 85'] * errorRatio * 1.0));
        const currMultS = Math.max(0.00, Math.min(1, prevMultS - errorsG['05-14'] * errorRatio * 1.0));

        const corrections: { [K in string]: number } = {};
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            const prevCorrG = modificationSet.modA.getCorrectionValue(ageGroup.getIndex());
            const currCorrG = Math.max(0.01, Math.min(4, prevCorrG - errorsG[ageGroup.getName()] * errorRatio * 0.25));
            corrections[ageGroup.getName()] = currCorrG;
        });

        if (iterationIndex % 10 < 3) {

            modificationSet.modA.acceptUpdate({
                multipliers: {
                    'other': currMultO,
                    'nursing': currMultN,
                    'school': currMultS
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
                corrections: {...corrections}
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
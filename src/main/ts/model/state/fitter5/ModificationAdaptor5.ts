import { Demographics } from '../../../common/demographics/Demographics';
import { StrainUtil } from '../../../util/StrainUtil';
import { TimeUtil } from '../../../util/TimeUtil';
import { ModelInstants } from '../../ModelInstants';
import { IModificationSet } from '../fitter/IModificationSet';
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

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, modificationIndex: number, progressCallback: (progress: IModelProgress) => void): Promise<{ [K in string]: number }> {

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });

        let errorRatio = 0.03;
        if (modificationIndex === 1) {
            errorRatio /= 10;
        }



        const errorsG: { [K in string]: number } = {};
        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {
            const cases = StrainUtil.findCases(stepData[stepData.length - 1], ageGroup);
            const error = cases.base != 0 ? (cases.data / cases.base) - 1 : 0;
            errorsG[ageGroup.getName()] = error;
            if (!error) {
                Math.random();
            }
        });

        const corrections: { [K in string]: number } = {};
        let currCorrT = 0;
        const ageGropups = Demographics.getInstance().getAgeGroups();
        ageGropups.forEach(ageGroup => {
            const prevCorrG = modificationSet.modA.getCorrectionValue(ageGroup.getIndex());
            const currCorrG = Math.max(0.01, Math.min(4, prevCorrG - errorsG[ageGroup.getName()] * errorRatio * 1.00));
            corrections[ageGroup.getName()] = currCorrG;
            currCorrT += currCorrG;
        });

        modificationSet.modA.acceptUpdate({
            multipliers: {
                'nursing': 0.8
            },
            corrections: { ...corrections }
        });

        modelStateIntegrator.rollback();

        return errorsG;

    }



}
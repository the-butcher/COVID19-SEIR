import { Demographics } from '../../../common/demographics/Demographics';
import { StrainUtil } from '../../../util/StrainUtil';
import { TimeUtil } from '../../../util/TimeUtil';
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
export class ModificationAdaptor6 {

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<{ [K in string]: number[] }> {

        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });
        const scanData = [referenceData, ...stepData];

        // get any current settings from the modification
        if (!modificationSet.modA.getModificationValues().dailyerrors) {
            modificationSet.modA.getModificationValues().dailyerrors = {} ;
        }
        const dailyerrorsprev = modificationSet.modA.getModificationValues().dailyerrors;


        const errorsG: { [K in string]: number[] } = {};
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

            // dailyerrorsprev[ageGroup.getName()] = errorsG[ageGroup.getName()];
            if (!dailyerrorsprev[ageGroup.getName()]) {
                dailyerrorsprev[ageGroup.getName()] = [];
            }
            errorsG[ageGroup.getName()] = dailyerrorsprev[ageGroup.getName()];


            for (let i = 1; i < scanData.length; i++) { // scanData.length

                // const casesA = StrainUtil.findCases(scanData[i - 1], ageGroup);
                // const casesB = StrainUtil.findCases(scanData[i], ageGroup);

                // const errorA = casesA.base != 0 ? (casesA.data / casesA.base) - 1 : 0;
                // const errorB = casesB.base != 0 ? (casesB.data / casesB.base) - 1 : 0;

                // const corrErrorG = (errorB - errorA) * 0.1; // correction for this step

                errorsG[ageGroup.getName()][i - 1] = 0;
                // errorsG[ageGroup.getName()][i - 1] = (4 - i) * -0.014;

                // if (i < 4) {
                //     errorsG[ageGroup.getName()][i - 1] = -0.04; // errorsG[ageGroup.getName()][i - 1] - corrErrorG;
                // } else if (i === 4) {
                //     errorsG[ageGroup.getName()][i - 1] = 0;
                // } else {
                //     errorsG[ageGroup.getName()][i - 1] = 0.04;
                // }


            }

            // normalize errors to sum up to zero
            // const errorsGSum = errorsG[ageGroup.getName()].reduce((a,b) => a + b, 0);
            // for (let i = 0; i < errorsG[ageGroup.getName()].length; i++) {
            //     errorsG[ageGroup.getName()][i] = errorsG[ageGroup.getName()][i] - errorsGSum / errorsG[ageGroup.getName()].length;
            // }
            // const errorsGSum2 = errorsG[ageGroup.getName()].reduce((a,b) => a + b, 0);
            // console.log(loggableRange, ageGroup.getName(), errorsGSum2)


        });

        modificationSet.modA.acceptUpdate({
            dailyerrors: dailyerrorsprev
        });

        modelStateIntegrator.rollback();

        return errorsG;

    }



}
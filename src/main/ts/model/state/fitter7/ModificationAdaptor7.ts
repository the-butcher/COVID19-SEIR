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
export class ModificationAdaptor7 {

    constructor() {


    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, progressCallback: (progress: IModelProgress) => void): Promise<IDataItem[]> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });

        modelStateIntegrator.rollback();

        for (let i=0; i<stepData.length; i++) {
            stepData[i].errors = {};
            stepData[i].derivs = {};
        }

        for (let i=1; i<stepData.length; i++) {

            Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

                const cases = StrainUtil.findCases(stepData[i], ageGroup);
                const error = (cases.data / cases.base) - 1;

                // write error to data
                stepData[i].errors[ageGroup.getName()] = error;

                // write derivate of error to data
                if (stepData[i - 1].errors) {
                    stepData[i - 1].derivs[ageGroup.getName()] = stepData[i].errors[ageGroup.getName()] - stepData[i - 1].errors[ageGroup.getName()];
                }

            });

        }

        return stepData;

    }



}
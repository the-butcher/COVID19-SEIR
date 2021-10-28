import { Demographics } from './../../../common/demographics/Demographics';
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
export class ModificationAdaptor4 implements IModificationAdaptor {

    constructor() {


    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<IValueErrors> {

        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationSet.modA.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });

        // stepData[stepData.length - 1].errors = {};
        // stepData[stepData.length - 1].derivs = {};

        Demographics.getInstance().getAgeGroupsWithTotal().forEach(ageGroup => {

            // add error at this specific point to the data item
            const cases = StrainUtil.findCases(stepData[stepData.length - 1], ageGroup);
            const error = (cases.data / cases.base) - 1;

            if (!stepData[stepData.length - 1].errors) {
                stepData[stepData.length - 1].errors = {};
            }
            stepData[stepData.length - 1].errors[ageGroup.getName()] = error;

            // if there is errors on reference data, calculate the derivate of error
            if (referenceData?.errors?.[ageGroup.getName()]) {
                if (!stepData[stepData.length - 1].derivs) {
                    stepData[stepData.length - 1].derivs = {};
                }
                stepData[stepData.length - 1].derivs[ageGroup.getName()] = stepData[stepData.length - 1].errors[ageGroup.getName()] - referenceData.errors[ageGroup.getName()];
                // console.log(loggableRange, referenceData.derivs[ageGroup.getName()]);
            }

        });




        return {
            errA: 0,
            errB: 0,
            data: stepData
        }

    }



}
import { Demographics } from '../../../common/demographics/Demographics';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationAdaptor } from '../fitter/IModificationAdaptor';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueErrors } from '../IValueAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ValueAdaptorCorrection3 } from './ValueAdaptorCorrection3';

/**
 * modification adapter for curve corrections
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type updates curve corrections, from the errors produced by correction adapters, one for each age-group
 * correction are applied to the first modification in a modification set assumed to exist from a starting modification and an ending modification
 */
export class ModificationAdaptorCorrections3 implements IModificationAdaptor {

    private readonly correctionAdapters: ValueAdaptorCorrection3[];
    constructor() {
        this.correctionAdapters = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.correctionAdapters[ageGroup.getIndex()] = new ValueAdaptorCorrection3(ageGroup);
        });
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<IValueErrors> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });
        const stepDataset = [referenceData, ...stepData];

        const correctionsA: { [K in string] : number } = {};
        let errA = 0;
        this.correctionAdapters.forEach(correctionAdapter => {
            const valueAdaption = correctionAdapter.adaptValues(modificationSet, stepDataset);
            correctionsA[correctionAdapter.getName()] = valueAdaption.currMultA;
            errA += valueAdaption.errA;
        });

        modificationSet.modA.acceptUpdate({
            corrections: {
                'family': correctionsA,
                'school': correctionsA,
                'nursing': correctionsA,
                'work': correctionsA,
                'other': correctionsA
            }
        });

        modelStateIntegrator.rollback();

        return {
            errA,
            errB: 0
        }

    }

}
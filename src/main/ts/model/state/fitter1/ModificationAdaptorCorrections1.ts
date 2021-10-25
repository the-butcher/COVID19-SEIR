import { Demographics } from '../../../common/demographics/Demographics';
import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationAdaptor } from '../fitter/IModificationAdaptor';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueErrors } from '../IValueAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ValueAdaptorCorrection1 } from './ValueAdaptorCorrection1';

/**
 * modification adapter for curve corrections
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type updates curve corrections, from the errors produced by correction adapters, one for each age-group
 * corrections are applied to the first and second modification in a modification set assumed to exist from a starting modification, a middle, and an ending modification
 */
export class ModificationAdaptorCorrections1 implements IModificationAdaptor {

    private readonly correctionAdapters: ValueAdaptorCorrection1[];
    constructor() {
        this.correctionAdapters = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.correctionAdapters[ageGroup.getIndex()] = new ValueAdaptorCorrection1(ageGroup);
        });
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<IValueErrors> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modC.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        const stepDataset = [referenceData, ...stepData];

        const correctionsA: { [K in string] : number } = {};
        const correctionsB: { [K in string] : number } = {};
        let errA = 0;
        let errB = 0;
        this.correctionAdapters.forEach(correctionAdapter => {
            const valueAdaption = correctionAdapter.adaptValues(modificationSet, stepDataset);
            correctionsA[correctionAdapter.getName()] = valueAdaption.currMultA;
            correctionsB[correctionAdapter.getName()] = valueAdaption.currMultB;
            if (Math.abs(valueAdaption.errA) > Math.abs(errA)) {
                errA = valueAdaption.errA;
            }
            if (Math.abs(valueAdaption.errB) > Math.abs(errB)) {
                errB = valueAdaption.errB;
            }
        });

        // console.log(loggableRange, 'correctA', correctionsA);

        modificationSet.modA.acceptUpdate({
            corrections: {
                'family': correctionsA,
                'school': correctionsA,
                'nursing': correctionsA,
                'work': correctionsA,
                'other': correctionsA
            }
        });
        modificationSet.modB.acceptUpdate({
            corrections: {
                'family': correctionsB,
                'school': correctionsB,
                'nursing': correctionsB,
                'work': correctionsB,
                'other': correctionsB
            }
        });

        modelStateIntegrator.rollback();

        return {
            errA,
            errB
        }
    }

}
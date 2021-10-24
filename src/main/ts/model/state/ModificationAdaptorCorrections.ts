import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { TimeUtil } from '../../util/TimeUtil';
import { ValueAdaptorCorrection } from './ValueAdaptorCorrection';
import { IModificationAdaptor } from './IModificationAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';
import { IModificationSet } from './ModelStateBuilder';
import { IValueErrors } from './IValueAdaptor';

export class ModificationAdaptorCorrections implements IModificationAdaptor {

    private readonly correctionAdapters: ValueAdaptorCorrection[];
    constructor() {
        this.correctionAdapters = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.correctionAdapters[ageGroup.getIndex()] = new ValueAdaptorCorrection(ageGroup);
        });
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<IValueErrors> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
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

        modificationSet.mod0.acceptUpdate({
            corrections: {
                'family': correctionsA,
                'school': correctionsA,
                'nursing': correctionsA,
                'work': correctionsA,
                'other': correctionsA
            }
        });
        modificationSet.modA.acceptUpdate({
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
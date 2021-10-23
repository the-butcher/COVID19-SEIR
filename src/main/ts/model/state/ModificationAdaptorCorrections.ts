import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { TimeUtil } from '../../util/TimeUtil';
import { ValueAdaptorCorrection } from './ValueAdaptorCorrection';
import { IModificationAdaptor } from './IModificationAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

export class ModificationAdaptorCorrections implements IModificationAdaptor {

    private readonly correctionAdapters: ValueAdaptorCorrection[];
    constructor() {
        this.correctionAdapters = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.correctionAdapters[ageGroup.getIndex()] = new ValueAdaptorCorrection(ageGroup);
        });
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationContactA: ModificationContact, modificationContactB: ModificationContact, modificationContactRatio: number, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<number> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            // drop data from callback
            progressCallback({
                ratio: modelProgress.ratio
            });
        });
        const stepDataset = [referenceData, ...stepData];

        const correctionsA: { [K in string] : number } = {};
        const correctionsB: { [K in string] : number } = {};
        this.correctionAdapters.forEach(correctionAdapter => {
            const adaptedValues = correctionAdapter.adaptValues(modificationContactA, modificationContactB, stepDataset);
            correctionsA[correctionAdapter.getName()] = adaptedValues.currMultA;
            correctionsB[correctionAdapter.getName()] = adaptedValues.currMultB;
        });

        // console.log(loggableRange, 'correctA', correctionsA);

        modificationContactA.acceptUpdate({
            corrections: {
                'family': correctionsA,
                'school': correctionsA,
                'nursing': correctionsA,
                'work': correctionsA,
                'other': correctionsA
            }
        });
        modificationContactB.acceptUpdate({
            corrections: {
                'family': correctionsB,
                'school': correctionsB,
                'nursing': correctionsB,
                'work': correctionsB,
                'other': correctionsB
            }
        });

        modelStateIntegrator.rollback();

        let maxError = 0;
        let curError: number;
        this.correctionAdapters.forEach(correctionAdapter => {
            curError = correctionAdapter.getError(modificationContactA);
            if (Math.abs(curError) > Math.max(maxError)) {
                maxError = curError;
            }
        });
        return maxError;

    }

}
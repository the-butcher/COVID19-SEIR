import { ModificationContact } from '../../common/modification/ModificationContact';
import { TimeUtil } from '../../util/TimeUtil';
import { ValueAdaptorMultiplier, IValueAdaptorMultiplierParams } from './ValueAdaptorMultiplier';
import { IModificationAdaptor } from './IModificationAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';
import { max } from '@amcharts/amcharts4/.internal/core/utils/Math';

export class ModificationAdaptorMultipliers implements IModificationAdaptor {

    private readonly multiplierAdapters: ValueAdaptorMultiplier[];

    constructor(...paramset: IValueAdaptorMultiplierParams[]) {
        this.multiplierAdapters = [];
        paramset.forEach(params => {
            this.multiplierAdapters.push(new ValueAdaptorMultiplier(params));
        });
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationContactA: ModificationContact, modificationContactB: ModificationContact, modificationContactRatio: number, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<number> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationContactB.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            progressCallback({
                ratio: modelProgress.ratio // drop data from callback
            });
        });
        const stepDataset = [referenceData, ...stepData];

        const multipliersA: { [K in string] : number } = {};
        const multipliersB: { [K in string] : number } = {};
        this.multiplierAdapters.forEach(multiplierAdapter => {
            const valueAdaption = multiplierAdapter.adaptValues(modificationContactA, modificationContactB, stepDataset);
            multipliersA[multiplierAdapter.getContactCategory()] = valueAdaption.currMultA;
            multipliersB[multiplierAdapter.getContactCategory()] = valueAdaption.currMultB;
        });

        modificationContactA.acceptUpdate({
            multipliers: multipliersA
        });
        modificationContactB.acceptUpdate({
            multipliers: multipliersB
        });

        modelStateIntegrator.rollback();

        let maxError = 0;
        let errA: number;
        let errB: number;
        this.multiplierAdapters.forEach(multiplierAdapter => {
            errA = multiplierAdapter.getError(modificationContactA);
            if (Math.abs(errA) > Math.max(maxError)) {
                maxError = errA;
            }
            errB = multiplierAdapter.getError(modificationContactB);
            if (Math.abs(errB) > Math.max(maxError)) {
                maxError = errB;
            }
        });
        return maxError;

    }

}
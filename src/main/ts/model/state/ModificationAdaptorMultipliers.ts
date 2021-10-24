import { TimeUtil } from '../../util/TimeUtil';
import { IModificationAdaptor } from './IModificationAdaptor';
import { IValueErrors } from './IValueAdaptor';
import { IModificationSet } from './ModelStateBuilder';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';
import { IValueAdaptorMultiplierParams, ValueAdaptorMultiplier } from './ValueAdaptorMultiplier';

export class ModificationAdaptorMultipliers implements IModificationAdaptor {

    private readonly multiplierAdapters: ValueAdaptorMultiplier[];

    constructor(...paramset: IValueAdaptorMultiplierParams[]) {
        this.multiplierAdapters = [];
        paramset.forEach(params => {
            this.multiplierAdapters.push(new ValueAdaptorMultiplier(params));
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

        const multipliersA: { [K in string] : number } = {};
        const multipliersB: { [K in string] : number } = {};
        let errA = 0;
        let errB = 0;
        this.multiplierAdapters.forEach(multiplierAdapter => {
            const valueAdaption = multiplierAdapter.adaptValues(modificationSet, stepDataset);
            multipliersA[multiplierAdapter.getContactCategory()] = valueAdaption.currMultA;
            multipliersB[multiplierAdapter.getContactCategory()] = valueAdaption.currMultB;
            if (Math.abs(valueAdaption.errA) > Math.abs(errA)) {
                errA = valueAdaption.errA;
            }
            if (Math.abs(valueAdaption.errB) > Math.abs(errB)) {
                errB = valueAdaption.errB;
            }
        });

        modificationSet.mod0.acceptUpdate({
            multipliers: multipliersA
        });
        modificationSet.modA.acceptUpdate({
            multipliers: multipliersB
        });

        modelStateIntegrator.rollback();

        return {
            errA,
            errB
        }

    }

}
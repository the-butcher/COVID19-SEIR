import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationAdaptor } from '../fitter/IModificationAdaptor';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueErrors } from '../IValueAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { IValueAdaptorMultiplierParams, ValueAdaptorMultiplier3 } from './ValueAdaptorMultiplier3';

/**
 * modification adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type updates curve multipliers, from the errors produced by 1-n value-adaptors
 * multipliers are applied to the first modification in a modification set assumed to exist from a starting modification and an ending modification
 */
export class ModificationAdaptorMultipliers3 implements IModificationAdaptor {

    private readonly multiplierAdapters: ValueAdaptorMultiplier3[];

    constructor(...paramset: IValueAdaptorMultiplierParams[]) {
        this.multiplierAdapters = [];
        paramset.forEach(params => {
            this.multiplierAdapters.push(new ValueAdaptorMultiplier3(params));
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
        let errA = 0;
        this.multiplierAdapters.forEach(multiplierAdapter => {
            const valueAdaption = multiplierAdapter.adaptValues(modificationSet, stepDataset);
            multipliersA[multiplierAdapter.getContactCategory()] = valueAdaption.currMultA;
            errA += valueAdaption.errA;
        });

        modificationSet.modA.acceptUpdate({
            multipliers: multipliersA
        });

        modelStateIntegrator.rollback();

        return {
            errA: errA,
            errB: 0
        }

    }

}
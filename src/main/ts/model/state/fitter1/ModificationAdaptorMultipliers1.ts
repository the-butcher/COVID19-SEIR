import { TimeUtil } from '../../../util/TimeUtil';
import { IModificationAdaptor } from '../fitter/IModificationAdaptor';
import { IModificationSet } from '../fitter/IModificationSet';
import { IValueAdaptorMultiplierParams } from '../fitter3/ValueAdaptorMultiplier3';
import { IValueErrors } from '../IValueAdaptor';
import { IDataItem, IModelProgress, ModelStateIntegrator } from '../ModelStateIntegrator';
import { ValueAdaptorMultiplier1 } from './ValueAdaptorMultiplier1';

/**
 * modification adapter for curve multipliers
 * @author h.fleischer
 * @since 25.10.2021
 *
 * this type updates curve multipliers, from the errors produced by 1-n value-adaptors
 * multipliers are applied to the first and second modification in a modification set assumed to exist from a starting modification, a middle, and an ending modification
 */
export class ModificationAdaptorMultipliers1 implements IModificationAdaptor {

    private readonly multiplierAdapters: ValueAdaptorMultiplier1[];

    constructor(...paramset: IValueAdaptorMultiplierParams[]) {
        this.multiplierAdapters = [];
        paramset.forEach(params => {
            this.multiplierAdapters.push(new ValueAdaptorMultiplier1(params));
        });
    }

    async adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<IValueErrors> {

        // let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

        modelStateIntegrator.checkpoint();

        const stepData = await modelStateIntegrator.buildModelData(modificationSet.modC.getInstant(), curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
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

        modificationSet.modA.acceptUpdate({
            multipliers: multipliersA
        });
        modificationSet.modB.acceptUpdate({
            multipliers: multipliersB
        });

        modelStateIntegrator.rollback();

        return {
            errA,
            errB
        }

    }

}
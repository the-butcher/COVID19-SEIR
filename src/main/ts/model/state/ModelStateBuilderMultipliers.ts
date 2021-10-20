import { ModificationContact } from '../../common/modification/ModificationContact';
import { TimeUtil } from '../../util/TimeUtil';
import { ContactAdapterMultiplier, IContactAdapterMultiplierParams } from './ContactAdapterMultiplier';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

export class ModelStateBuilderMultipliers {

    private readonly multiplierAdapters: ContactAdapterMultiplier[];

    constructor(...paramset: IContactAdapterMultiplierParams[]) {
        this.multiplierAdapters = [];
        paramset.forEach(params => {
            this.multiplierAdapters.push(new ContactAdapterMultiplier(params));
        });
    }

    async adaptValues(modelStateIntegrator: ModelStateIntegrator, modificationContactA: ModificationContact, modificationContactB: ModificationContact, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<void> {

        let loggableRange = `${TimeUtil.formatCategoryDate(modelStateIntegrator.getInstant())} >> ${TimeUtil.formatCategoryDate(modificationContactB.getInstant())}`;

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
            const adaptedValues = multiplierAdapter.adaptValues(modificationContactA, modificationContactB, stepDataset);
            multipliersA[multiplierAdapter.getContactCategory()] = adaptedValues.currMultA;
            multipliersB[multiplierAdapter.getContactCategory()] = adaptedValues.currMultB;
        });

        modificationContactA.acceptUpdate({
            multipliers: multipliersA
        });
        modificationContactB.acceptUpdate({
            multipliers: multipliersB
        });

        modelStateIntegrator.rollback();

    }

}
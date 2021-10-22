import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelStateIntegrator, IDataItem, IModelProgress } from './ModelStateIntegrator';

export interface IModificationAdaptor {

    adapt(modelStateIntegrator: ModelStateIntegrator, modificationContactA: ModificationContact, modificationContactB: ModificationContact, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<number>;

}
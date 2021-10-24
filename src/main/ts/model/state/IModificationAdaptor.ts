import { IValueErrors } from './IValueAdaptor';
import { IModificationSet } from './ModelStateBuilder';
import { IDataItem, IModelProgress, ModelStateIntegrator } from './ModelStateIntegrator';

export interface IModificationAdaptor {

    adapt(modelStateIntegrator: ModelStateIntegrator, modificationSet: IModificationSet, referenceData: IDataItem, progressCallback: (progress: IModelProgress) => void): Promise<IValueErrors>;

}
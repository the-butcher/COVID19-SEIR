import { ModificationTime } from '../common/modification/ModificationTime';
import { IModelState } from './state/IModelState';

/**
 * definition for types that accept a model state and, given a time step size (dT) and time position (tT), can calculate a delta from state(tT) to state(tT+dT)
 *
 * @author h.fleischer
 * @since 31.03.2021
 */
export interface IModelIntegrationStep {
    apply(state: IModelState, dT: number, tT: number, modificationTime: ModificationTime): IModelState;
}

import { IModelIntegrationStep } from './IModelIntegrationStep';
import { IValueHolder } from './IValueHolder';
import { ModelImplRoot } from './ModelImplRoot';
import { IModelState } from './state/IModelState';

/**
 * definition for a SEIR root-model or submodel
 *
 * @author h.fleischer
 * @since 16.05.2021
 */
export interface IModelSeir extends IModelIntegrationStep, IValueHolder {

    /**
     * get the root-model of this instance (root-model will return itself, submodels the respective root)
     */
    getRootModel(): ModelImplRoot;

    /**
     * get this model's initial state, ready to be used by ModelStateIntegrator
     */
    getInitialState(): IModelState;

    isValid(): boolean;

    /**
     * get the normalized values sum of all compartments associated with the given age-group
     * @param ageGroupIndex
     */
    getNrmValueGroup(ageGroupIndex: number): number;

}


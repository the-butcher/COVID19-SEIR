import { IBaseDataConfig } from './basedata/BaseData';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IDemographicsConfig } from '../common/demographics/IDemographicsConfig';
import { IFitterParams } from './state/ModelStateIntegrator';

/**
 * definition for data transfer to the model calculation worker
 *
 * @author h.fleischer
 * @since 21.05.2021
 *
 */
export interface IWorkerInput {
    minInstant: number;
    maxInstant: number;
    demographicsConfig: IDemographicsConfig;
    modificationValues: IModificationValues[];
    baseDataConfig: IBaseDataConfig;
    fitterParams?: IFitterParams;
}
import { IModificationValues } from '../common/modification/IModificationValues';
import { IDemographicsConfig } from '../common/demographics/IDemographicsConfig';

/**
 * definition for data transfer to the model calculation worker
 *
 * @author h.fleischer
 * @since 21.05.2021
 *
 */
export interface IWorkerInput {

    demographicsConfig: IDemographicsConfig;

    modificationValues: IModificationValues[];

}
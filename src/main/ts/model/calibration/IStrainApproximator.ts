import { IModelProgress } from './../state/ModelStateIntegrator';
import { IBaseDataItemConfig } from '../basedata/BaseData';
import { IBaseDataItem } from '../basedata/BaseDataItem';

/**
 * shallow definition for types that can approximate initial incidences in the model
 * as of 22.06.2021 there is
 * A) one implementation for standard model behaviour based on real data
 * B) one implementation for calibration (where an attempt is made to calibrate a transmission risk for each individual strain)
 */
export interface IStrainApproximator {

    approximate(progressCallback: (progress: IModelProgress) => void): Promise<void>;

    getReferenceDataRemoved(): IBaseDataItem;

}
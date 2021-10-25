import { ModificationContact } from '../../common/modification/ModificationContact';
import { IModificationSet } from './fitter1/ModelStateFitter1';
import { IDataItem } from './ModelStateIntegrator';

export interface IValueErrors {
    errA: number;
    errB: number;
}
export interface IValueAdaption extends IValueErrors {
    prevMultA: number;
    currMultA: number;
    prevMultB: number;
    currMultB: number;
}

export interface IValueAdaptor {

    getError(modificationContact: ModificationContact): number;

    adaptValues(modificationSet: IModificationSet, stepDataset: IDataItem[]): IValueAdaption;

}
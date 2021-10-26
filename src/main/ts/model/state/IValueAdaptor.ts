import { ModificationContact } from '../../common/modification/ModificationContact';
import { IModificationSet } from './fitter/IModificationSet';
import { IDataItem } from './ModelStateIntegrator';

export interface IValueErrors {
    errA: number;
    errB: number;
    data?: IDataItem[];
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
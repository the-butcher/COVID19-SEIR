import { IModelProgress } from './../model/state/ModelStateIntegrator';
// @ts-ignore
import ModelWorker from "worker-loader!./../work";
import { IDemographicsConfig } from '../common/demographics/IDemographicsConfig';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IWorkerInput } from '../model/IWorkerInput';
import { Logger } from './../util/Logger';
import { ChartAgeGroup } from './chart/ChartAgeGroup';

export class ModelLoader {

    static async commit(demographicsConfig: IDemographicsConfig, modificationValues: IModificationValues[]): Promise<void> {

        // const modelStateIntegrator = await ModelImplRoot.setupInstance(Demographics.getInstance(), Modifications.getInstance());
        // const minInstant = ModelConstants.MODEL_MIN_______________DATE;
        // const maxInstant = ModelConstants.MODEL_MAX_______________DATE;
        // const modelData = await modelStateIntegrator.buildModelData(Demographics.getInstance(), minInstant, maxInstant);
        // Logger.getInstance().log('modelData A', modelData);
        // ChartAgeGroup.getInstance().acceptModelData(modelData);

        const workerInput: IWorkerInput = {
            demographicsConfig,
            modificationValues
        }

        const worker = new ModelWorker(); // TODO reuse worker (and may allow cancellation of previous calculations)
        Logger.getInstance().log('posting message to', worker);
        worker.postMessage(workerInput);
        worker.onmessage = (e: MessageEvent) => {
            const modelProgress: IModelProgress = e.data;
            if (modelProgress.ratio === 1 && modelProgress.data) {
                ChartAgeGroup.getInstance().acceptModelData(modelProgress.data);
            }
            Logger.getInstance().log('got model data from worker', e.data);
            //
        };

    }

}
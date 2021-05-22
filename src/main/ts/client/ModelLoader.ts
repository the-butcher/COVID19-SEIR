import { IModelProgress } from './../model/state/ModelStateIntegrator';
// @ts-ignore
import ModelWorker from "worker-loader!./../work";
import { IDemographicsConfig } from '../common/demographics/IDemographicsConfig';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IWorkerInput } from '../model/IWorkerInput';
import { Logger } from './../util/Logger';
import { ChartAgeGroup } from './chart/ChartAgeGroup';
import { SliderModification } from './gui/SliderModification';

export class ModelLoader {

    private static worker: ModelWorker;

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

        /**
         * terminate any running worker
         */
        if (ModelLoader.worker) {
            ModelLoader.worker.terminate();
        }

        /**
         * pass input for a full model rebuild to a web-worker where a few seconds of calculation will not interfere with responsiveness of gui
         */
        ModelLoader.worker = new ModelWorker();
        ModelLoader.worker.postMessage(workerInput);
        ModelLoader.worker.onmessage = (e: MessageEvent) => {
            const modelProgress: IModelProgress = e.data;
            if (modelProgress.ratio === 1 && modelProgress.data) {
                ChartAgeGroup.getInstance().acceptModelData(modelProgress.data);
                SliderModification.getInstance().setProgress(0);
            } else {
                SliderModification.getInstance().setProgress(modelProgress.ratio);
            }
        };

    }

}
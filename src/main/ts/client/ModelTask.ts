import { MODIFICATION____KEY } from '../model/ModelConstants';
// @ts-ignore
import ModelWorker from "worker-loader!./../work";
import { IDemographicsConfig } from '../common/demographics/IDemographicsConfig';
import { IModificationValues } from '../common/modification/IModificationValues';
import { IWorkerInput } from '../model/IWorkerInput';
import { IModelProgress } from '../model/state/ModelStateIntegrator';
import { ChartAgeGroup } from './chart/ChartAgeGroup';
import { SliderModification } from './gui/SliderModification';
import { ControlsConstants } from './gui/ControlsConstants';

/**
 * utility type that will pass rebuilding of the model to a web-worker
 *
 * @author h.fleischer
 * @since 22.05.2021
 */
export class ModelTask {

    /**
     * static worker instance, terminated each time the model is rebuilt
     */
    private static worker: ModelWorker;

    static async commit(key: MODIFICATION____KEY, demographicsConfig: IDemographicsConfig, modificationValues: IModificationValues[]): Promise<void> {

        // 1. update for immediate response
        ControlsConstants.rebuildModificationChart(ControlsConstants.MODIFICATION_PARAMS[key].createModificationResolver());

        // const modelStateIntegrator = await ModelImplRoot.setupInstance(Demographics.getInstance(), Modifications.getInstance());
        // const minInstant = ModelConstants.MODEL_MIN_______________DATE;
        // const maxInstant = ModelConstants.MODEL_MAX_______________DATE;
        // const modelData = await modelStateIntegrator.buildModelData(Demographics.getInstance(), minInstant, maxInstant);
        // Logger.getInstance().log('modelData A', modelData);
        // ChartAgeGroup.getInstance().acceptModelData(modelData);

        /**
         * build worker input
         */
        const workerInput: IWorkerInput = {
            demographicsConfig,
            modificationValues
        }

        /**
         * terminate any running worker
         */
        if (ModelTask.worker) {
            ModelTask.worker.terminate();
        }

        /**
         * pass input for a full model rebuild to a web-worker where a few seconds of calculation will not interfere with responsiveness of gui
         */
        ModelTask.worker = new ModelWorker();
        ModelTask.worker.postMessage(workerInput);
        ModelTask.worker.onmessage = async (e: MessageEvent) => {
            const modelProgress: IModelProgress = e.data;
            if (modelProgress.ratio >= 1 && modelProgress.data) {

                await ChartAgeGroup.getInstance().acceptModelData(modelProgress.data);

                // 2. update to be sure that modification chart shows on initial load
                ControlsConstants.rebuildModificationChart(ControlsConstants.MODIFICATION_PARAMS[key].createModificationResolver());

                SliderModification.getInstance().setProgress(0);
                // ModelLoader.worker.terminate();
                // ModelLoader.worker = null;

            } else {
                SliderModification.getInstance().setProgress(modelProgress.ratio);
            }
        };


    }

}
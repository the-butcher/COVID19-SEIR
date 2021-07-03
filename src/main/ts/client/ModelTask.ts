// @ts-ignore
import ModelWorker from "worker-loader!./../work";
import { IWorkerInput } from '../model/IWorkerInput';
import { MODIFICATION____KEY } from '../model/ModelConstants';
import { IModelProgress } from '../model/state/ModelStateIntegrator';
import { ModificationResolverStrain } from './../common/modification/ModificationResolverStrain';
import { ModelConstants } from './../model/ModelConstants';
import { ChartAgeGroup } from './chart/ChartAgeGroup';
import { ControlsConstants } from './gui/ControlsConstants';
import { SliderModification } from './gui/SliderModification';

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

    static async commit(key: MODIFICATION____KEY, workerInput: IWorkerInput): Promise<void> {

        // 1. update for immediate response
        ControlsConstants.rebuildModificationChart(ControlsConstants.MODIFICATION_PARAMS[key].getModificationResolver());

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
                await ChartAgeGroup.getInstance().renderModelData();

                /**
                 * primary strain has a "floating value", update the value on the gui instance of that modification
                 */
                const primaryStrainModification = new ModificationResolverStrain().getModifications()[0];
                const dstIncidence = modelProgress.data[0].valueset[ModelConstants.AGEGROUP_NAME_______ALL].INCIDENCES[primaryStrainModification.getId()];
                primaryStrainModification.acceptUpdate({
                    dstIncidence
                });

                // 2. update to be sure that modification chart shows on initial load
                ControlsConstants.rebuildModificationChart(ControlsConstants.MODIFICATION_PARAMS[key].getModificationResolver());

                SliderModification.getInstance().setProgress(0);
                // ModelLoader.worker.terminate();
                // ModelLoader.worker = null;

            } else {
                SliderModification.getInstance().setProgress(modelProgress.ratio);
            }
        };

    }

}
import { ModificationResolverTime } from './../common/modification/ModificationResolverTime';
// @ts-ignore
import ModelWorker from "worker-loader!./../work";
import { Modifications } from '../common/modification/Modifications';
import { IWorkerInput } from '../model/IWorkerInput';
import { MODIFICATION____KEY } from '../model/ModelConstants';
import { IFitterParams, IModelProgress } from '../model/state/ModelStateIntegrator';
import { ModificationContact } from './../common/modification/ModificationContact';
import { ModificationResolverStrain } from './../common/modification/ModificationResolverStrain';
import { ModelConstants } from './../model/ModelConstants';
import { ChartAgeGroup } from './chart/ChartAgeGroup';
import { ChartAgeGroupFlow } from './chart/ChartAgeGroupFlow';
import { ControlsContact } from './controls/ControlsContact';
import { ControlsConstants } from './gui/ControlsConstants';
import { SliderModification } from './gui/SliderModification';
import { StorageUtil } from './storage/StorageUtil';
import { ModificationResolverRegression } from '../common/modification/ModificationResolverRegression';
import { ModificationRegression } from '../common/modification/ModificationRegression';

/**
 * utility type that will pass rebuilding of the model to a web-worker
 *
 * @author h.fleischer
 * @since 22.05.2021
 */
export class ModelTask {

    /**
     * static worker instance, terminated and restarted each time the model is rebuilt
     */
    private static worker: ModelWorker;

    private static fitterParams: IFitterParams = {
        derivRatio: 0.1,
        errorTLast: -1,
        fitter7Idx: 0
    }

    static async commit(key: MODIFICATION____KEY, workerInput: IWorkerInput): Promise<void> {

        /**
         * terminate any running worker
         */
        if (ModelTask.worker) {
            ModelTask.worker.terminate();
            ModelTask.worker = null;
        }

        workerInput.fitterParams = ModelTask.fitterParams;

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

                await ChartAgeGroupFlow.getInstance().acceptModelData(modelProgress.data);
                await ChartAgeGroupFlow.getInstance().renderModelData();

                /**
                 * primary strain has a "floating value", update the value on the gui instance of that modification
                 */
                const primaryStrainModification = new ModificationResolverStrain().getModifications()[0];
                const dstIncidence = modelProgress.data[0].valueset[ModelConstants.AGEGROUP_NAME_______ALL].INCIDENCES[primaryStrainModification.getId()];
                primaryStrainModification.acceptUpdate({
                    dstIncidence
                });

                ModelTask.fitterParams = modelProgress.fitterParams;

                /**
                 * restore any values that may have been altered in the worker
                 */
                modelProgress.modificationValuesContact?.forEach(modificationValuesContact => {
                    const modificationContact = Modifications.getInstance().findModificationById(modificationValuesContact.id) as ModificationContact;
                    // console.log(modificationContact.getId(), TimeUtil.formatCategoryDate(modificationContact.getInstant()), modificationValuesContact.multipliers);
                    modificationContact.acceptUpdate({
                        multipliers: modificationValuesContact.multipliers,
                        corrections: modificationValuesContact.corrections,
                        dailyerrors: modificationValuesContact.dailyerrors
                    });
                    StorageUtil.getInstance().setSaveRequired(true);
                });

                // if (modelProgress.modificationValuesRegression) {
                //     const modificationRegression = Modifications.getInstance().findModificationById(modelProgress.modificationValuesRegression.id) as ModificationRegression;
                //     modificationRegression.acceptUpdate({
                //         ...modelProgress.modificationValuesRegression,
                //         vaccination_configs: {} // omit vacc configs, these dont change doring model build
                //     });
                // }

                // setTimeout(() => {
                //     // ChartAgeGroup.getInstance().exportToPng().then(() => {
                //         ModelTask.commit('CONTACT', ControlsConstants.createWorkerInput());
                //     // });
                // }, 3000);

                // show any contact updates
                // const displayableModification = ControlsContact.getInstance().getModification();
                // ControlsContact.getInstance().acceptModification(displayableModification);

                SliderModification.getInstance().setProgress(0);
                // ModelTask.worker.terminate();
                // ModelTask.worker = null;

                ModificationResolverTime.getInstance().buildModificationData();


            } else {
                SliderModification.getInstance().setProgress(modelProgress.ratio);
            }
        };

    }

}
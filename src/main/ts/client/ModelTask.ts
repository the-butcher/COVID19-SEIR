import { ControlsContact } from './controls/ControlsContact';
import { ModificationContact } from './../common/modification/ModificationContact';
import { ChartAgeGroupFlow } from './chart/ChartAgeGroupFlow';
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
import { Modifications } from '../common/modification/Modifications';
import { TimeUtil } from '../util/TimeUtil';
import { StorageUtil } from './storage/StorageUtil';

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

    static async commit(key: MODIFICATION____KEY, workerInput: IWorkerInput): Promise<void> {

        // 1. update for immediate response
        ControlsConstants.rebuildModificationChart(ControlsConstants.MODIFICATION_PARAMS[key].getModificationResolver());

        /**
         * terminate any running worker
         */
        if (ModelTask.worker) {
            ModelTask.worker.terminate();
            ModelTask.worker = null;
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

                modelProgress.modificationValuesContact.forEach(modificationValuesContact => {
                    const modificationContact = Modifications.getInstance().findModificationById(modificationValuesContact.id) as ModificationContact;
                    // console.log(modificationContact.getId(), TimeUtil.formatCategoryDate(modificationContact.getInstant()), modificationValuesContact.multipliers);
                    modificationContact.acceptUpdate({
                        multipliers: modificationValuesContact.multipliers,
                        corrections: modificationValuesContact.corrections,
                        adaptCorrections: modificationValuesContact.adaptCorrections,
                        adaptMultipliers: modificationValuesContact.adaptMultipliers
                    });
                    StorageUtil.getInstance().setSaveRequired(true);
                    setTimeout(() => {
                        ModelTask.commit('CONTACT', ControlsConstants.createWorkerInput());
                    }, 1000);
                    // SliderModification.getInstance().indicateUpdate(modificationContact.getId());
                });

                // 2. update to be sure that modification chart shows on initial load
                ControlsConstants.rebuildModificationChart(ControlsConstants.MODIFICATION_PARAMS[key].getModificationResolver());

                // show any contact updates
                const displayableModification = ControlsContact.getInstance().getModification();
                ControlsContact.getInstance().acceptModification(displayableModification);

                if (modelProgress.modificationValuesContact.length > 5) {

                    // const modificationValuesA = modelProgress.modificationValuesContact[modelProgress.modificationValuesContact.length - 3];
                    // const modificationValuesB = modelProgress.modificationValuesContact[modelProgress.modificationValuesContact.length - 2];

                    // const modificationContactA = Modifications.getInstance().findModificationById(modificationValuesA.id) as ModificationContact;
                    // const modificationContactB = Modifications.getInstance().findModificationById(modificationValuesB.id) as ModificationContact;

                    // console.log(modificationContactB);

                    // still some corrections pending
                    // if (modificationContactB.isAdaptCorrections()) {

                    //     // toggle on both A and B depending on B's state
                    //     // modificationContactA.acceptUpdate({
                    //     //     adaptMultipliers: !modificationContactB.isAdaptMultipliers(),
                    //     //     adaptCorrections: true
                    //     // });
                    //     modificationContactB.acceptUpdate({
                    //         adaptMultipliers: !modificationContactB.isAdaptMultipliers(),
                    //         adaptCorrections: true
                    //     });
                    //     StorageUtil.getInstance().setSaveRequired(true);

                    //     setTimeout(() => {
                    //         ModelTask.commit('CONTACT', ControlsConstants.createWorkerInput());
                    //     }, 3000);

                    // } else {

                    //     // modificationContactA.acceptUpdate({
                    //     //     adaptMultipliers: false,
                    //     //     adaptCorrections: false
                    //     // });
                    //     modificationContactB.acceptUpdate({
                    //         adaptMultipliers: false,
                    //         adaptCorrections: false
                    //     });

                    // }

                }

                SliderModification.getInstance().setProgress(0);
                // ModelTask.worker.terminate();
                // ModelTask.worker = null;


            } else {
                SliderModification.getInstance().setProgress(modelProgress.ratio);
            }
        };

    }

}
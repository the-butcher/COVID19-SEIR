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
import { QueryUtil } from '../util/QueryUtil';
import { ModificationDiscovery } from '../common/modification/ModificationDiscovery';
import { TimeUtil } from '../util/TimeUtil';
import { ModificationResolverDiscovery } from '../common/modification/ModificationResolverDiscovery';
import { ModificationStrain } from '../common/modification/ModificationStrain';
import { AgeGroup } from '../common/demographics/AgeGroup';
import { Demographics } from '../common/demographics/Demographics';

export type WORKER_MODE = 'REGRESSION' | 'PROJECTION' | 'REBUILDING';

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
        maxErrorTolerance: 0.40,
        curErrorCalculate: Number.MAX_VALUE
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

                /**
                 * primary strain has a "floating value", update the value on the gui instance of that modification
                 */
                const primaryStrainModification = new ModificationResolverStrain().getModifications()[0];
                const dstIncidence = modelProgress.data[0].valueset[ModelConstants.AGEGROUP_NAME_______ALL].INCIDENCES[primaryStrainModification.getId()];
                primaryStrainModification.acceptUpdate({
                    dstIncidence
                });

                ModelTask.fitterParams = modelProgress.fitterParams;
                if (QueryUtil.getInstance().getWorkerMode() === 'REBUILDING') {
                    document.title = `COVID19-SEIR (${ModelTask.fitterParams.maxErrorTolerance.toFixed(4)}) - ${ModelTask.fitterParams.currDateCalculate}`;
                }

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
                    // StorageUtil.getInstance().setSaveRequired(true);
                });

                // console.log('modelProgress.modificationValuesDiscovery', modelProgress.modificationValuesDiscovery);
                // COMMENT :: POS
                const ageGroups = Demographics.getInstance().getAgeGroups();
                modelProgress.modificationValuesDiscovery?.forEach(modificationValuesDiscovery => {

                    const modificationDiscovery = Modifications.getInstance().findModificationById(modificationValuesDiscovery.id) as ModificationDiscovery;
                    // let saveRequired = false;
                    // const positivityRateChange = Math.abs(modificationValuesDiscovery.positivityRate - modificationDiscovery.getPositivityRate());
                    // if (positivityRateChange > 0.002) {
                    // console.log('positivityRateChange', TimeUtil.formatCategoryDateFull(modificationValuesDiscovery.instant), positivityRateChange, modificationDiscovery.getId());
                    const correctionUdates: { [x: string]: number } = {};
                    ageGroups.forEach(ageGroup => {
                        let correctionUdate = modificationValuesDiscovery.corrections?.[ageGroup.getName()];
                        if (correctionUdate) {
                            correctionUdate = (modificationDiscovery.getCorrectionValue(ageGroup.getIndex()) + correctionUdate) / 2;
                            correctionUdates[ageGroup.getName()] = correctionUdate;
                        }
                    });
                    modificationDiscovery.acceptUpdate({
                        positivityRate: modificationValuesDiscovery.positivityRate,
                        corrections: correctionUdates
                    });
                    // saveRequired = true;
                    // }
                    // if (saveRequired) {
                    // StorageUtil.getInstance().setSaveRequired(true);
                    // }
                });
                ModificationResolverDiscovery.resetRegression();

                modelProgress.modificationValuesStrain?.forEach(modificationValuesStrain => {
                    const modificationStrain = Modifications.getInstance().findModificationById(modificationValuesStrain.id) as ModificationStrain;
                    // console.log(modificationContact.getId(), TimeUtil.formatCategoryDate(modificationContact.getInstant()), modificationValuesContact.multipliers);
                    modificationStrain.acceptUpdate({
                        r0: modificationValuesStrain.r0,
                        preIncidences: modificationValuesStrain.preIncidences,
                        transmissionRisk: modificationValuesStrain.transmissionRisk,
                        dstIncidence: modificationValuesStrain.dstIncidence
                    });
                    // StorageUtil.getInstance().setSaveRequired(true);
                });

                StorageUtil.getInstance().setSaveRequired(true);

                await ChartAgeGroup.getInstance().acceptModelData(modelProgress.data);
                await ChartAgeGroup.getInstance().renderModelData();

                await ChartAgeGroupFlow.getInstance().acceptModelData(modelProgress.data);
                await ChartAgeGroupFlow.getInstance().renderModelData();

                const modificationRegression = new ModificationResolverRegression().getModifications()[0];
                modificationRegression.updateCorrectionRegressionsTotal();

                // const modificationRegression = new ModificationResolverRegression().getModifications()[0];
                // modificationRegression.acceptUpdate({
                //     ...modificationRegression.getModificationValues()
                // });
                // if (modelProgress.modificationValuesRegression) {
                //     const modificationRegression = Modifications.getInstance().findModificationById(modelProgress.modificationValuesRegression.id) as ModificationRegression;
                //     modificationRegression.acceptUpdate({
                //         ...modelProgress.modificationValuesRegression,
                //         vaccination_configs: {} // omit vacc configs, these dont change doring model build
                //     });
                // }

                if (QueryUtil.getInstance().getWorkerMode() === 'REBUILDING') {
                    setTimeout(() => {
                        // ChartAgeGroup.getInstance().exportToPng().then(() => {
                        ModelTask.commit('CONTACT', ControlsConstants.createWorkerInput());
                        // });
                    }, 100);
                }

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
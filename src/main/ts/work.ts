import { ModelStateFitter5 } from './model/state/fitter5/ModelStateFitter5';
import { Demographics } from './common/demographics/Demographics';
import { IModificationValuesDiscovery } from './common/modification/IModificationValueDiscovery';
import { IModificationValuesStrain } from './common/modification/IModificationValuesStrain';
import { ModificationResolverContact } from './common/modification/ModificationResolverContact';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { StrainCalibrator } from './model/calibration/StrainCalibrator';
import { IWorkerInput } from './model/IWorkerInput';
import { ModelImplRoot } from './model/ModelImplRoot';
import { ModelInstants } from './model/ModelInstants';
import { ModelStateFitter1 } from './model/state/fitter1/ModelStateFitter1';
import { ModelStateFitter3 } from './model/state/fitter3/ModelStateFitter3';
import { ModelStateFitter4 } from './model/state/fitter4/ModelStateFitter4';
import { Logger } from './util/Logger';
import { TimeUtil } from './util/TimeUtil';

const ctx: Worker = self as any;

// We send a message back to the main thread
ctx.addEventListener("message", async (event: MessageEvent) => {

    Logger.setInstance(self.console.log);

    try {

        const workerInput: IWorkerInput = event.data;

        const minInstant = workerInput.minInstant;
        const maxInstant = workerInput.maxInstant;

        const demographicsConfig = workerInput.demographicsConfig;
        const modificationValues = workerInput.modificationValues;
        const baseDataConfig = workerInput.baseDataConfig;

        ModelInstants.setInstanceFromValues([minInstant, maxInstant]);

        /**
         * create a demographics singleton (in worker scope, this does not interfere with main scope)
         */
        Demographics.setInstanceFromConfig('worker', demographicsConfig);

        /**
         * create a base-data singleton (in worker scope, this does not interfere with main scope)
         */
        BaseData.setInstanceFromConfig('worker', baseDataConfig);
        BaseData.getInstance().calculateDailyStats();

        /**
         * calibrate strain values to have transmission risk set properly (in an SEIS model the strain would then hold equilibrium at R0=1 and the strain's initial incidence)
         * any change in strain and first testing value would require re-calibration
         */
        const modificationValuesDiscovery = modificationValues.find(m => m.key === 'TESTING') as IModificationValuesDiscovery;
        modificationValues.filter(m => m.key === 'STRAIN').forEach((modificationValuesStrain: IModificationValuesStrain) => {
            StrainCalibrator.calibrate(Demographics.getInstance(), modificationValuesStrain, modificationValuesDiscovery, BaseData.getInstance());
        });

        // recreate singleton, since the calibrator changes things
        Modifications.setInstanceFromValues(modificationValues);

        const modelStateIntegrator = await ModelImplRoot.setupInstance(Demographics.getInstance(), Modifications.getInstance(), BaseData.getInstance(), modelProgress => {
            ctx.postMessage(modelProgress);
        });

        // new ModelStateFitter5().adapt(workerInput.fitterParams, modelStateIntegrator, maxInstant, modelProgress => {
        //     ctx.postMessage(modelProgress);
        // }).then(data => {
        //     data.modificationValuesContact = new ModificationResolverContact().getModifications().map(m => m.getModificationValues());
        //     ctx.postMessage(data);
        // });

        new ModelStateFitter4().adapt(workerInput.fitterParams, modelStateIntegrator, maxInstant, modelProgress => {
            ctx.postMessage(modelProgress);
        }).then(data => {
            data.modificationValuesContact = new ModificationResolverContact().getModifications().map(m => m.getModificationValues());
            ctx.postMessage(data);
        });

        // /**
        //  * complete model build (add more sophisticated logic here)
        //  */
        // modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
        //     ctx.postMessage(modelProgress);
        // });

    } catch (error: any) {
        Logger.getInstance().log('failed to work due to: ', error);
    }

});

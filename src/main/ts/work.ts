import { Demographics } from './common/demographics/Demographics';
import { IModificationValuesStrain } from './common/modification/IModificationValuesStrain';
import { IModificationValuesTesting } from './common/modification/IModificationValuesTesting';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/calibration/BaseData';
import { IWorkerInput } from './model/IWorkerInput';
import { ModelImplRoot } from './model/ModelImplRoot';
import { ModelInstants } from './model/ModelInstants';
import { StrainCalibrator } from './model/calibration/StrainCalibrator';
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
        // Logger.getInstance().log('minInstant', minInstant, 'maxInstant', maxInstant);

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

        /**
         * calibrate strain values to have transmission risk set properly (in an SEIS model the strain would then hold equilibrium at R0=1 and the strain's initial incidence)
         */
        const modificationValuesTesting = modificationValues.find(m => m.key === 'TESTING') as IModificationValuesTesting;
        modificationValues.filter(m => m.key === 'STRAIN').forEach((modificationValuesStrain: IModificationValuesStrain) => {
            StrainCalibrator.calibrate(Demographics.getInstance(), modificationValuesStrain, modificationValuesTesting, BaseData.getInstance());
        });

        // recreate singleton, since the calibrator changes things
        Modifications.setInstanceFromValues(modificationValues);

        const modelStateIntegrator = await ModelImplRoot.setupInstance(Demographics.getInstance(), Modifications.getInstance(), BaseData.getInstance(), modelProgress => {
            ctx.postMessage(modelProgress);
        });

        modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            ctx.postMessage(modelProgress);
        });

    } catch (error: any) {
        Logger.getInstance().log('failed to work due to: ', error);
    }

});

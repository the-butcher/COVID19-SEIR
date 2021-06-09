import { BaseData } from './model/incidence/BaseData';
import { Demographics } from './common/demographics/Demographics';
import { IModificationValuesStrain } from './common/modification/IModificationValuesStrain';
import { IModificationValuesTesting } from './common/modification/IModificationValuesTesting';
import { Modifications } from './common/modification/Modifications';
import { IWorkerInput } from './model/IWorkerInput';
import { ModelConstants } from './model/ModelConstants';
import { ModelImplRoot } from './model/ModelImplRoot';
import { StrainCalibrator } from './model/StrainCalibrator';
import { Logger } from './util/Logger';
import { TimeUtil } from './util/TimeUtil';

const ctx: Worker = self as any;

// We send a message back to the main thread
ctx.addEventListener("message", async (event: MessageEvent) => {

    Logger.setInstance(self.console.log);

    try {

        const workerInput: IWorkerInput = event.data;
        const demographicsConfig = workerInput.demographicsConfig;
        const modificationValues = workerInput.modificationValues;
        const baseDataConfig = workerInput.baseDataConfig;

        /**
         * create a demographics singleton (in worker scope, this does not interfere with main scope)
         */
        Demographics.setInstanceFromConfig(demographicsConfig);

        /**
         * create a base-data singleton (in worker scope, this does not interfere with main scope)
         */
        BaseData.setInstanceFromConfig(baseDataConfig);

        /**
         * calibrate strain values to have transmission risk set properly (in an SEIS model the strain would then hold equilibrium at R0=1 and the strain's initial incidence)
         */
        const modificationValuesTesting = modificationValues.find(m => m.key === 'TESTING') as IModificationValuesTesting;
        modificationValues.filter(m => m.key === 'STRAIN').forEach((modificationValuesStrain: IModificationValuesStrain) => {
            StrainCalibrator.calibrate(Demographics.getInstance(), modificationValuesStrain, modificationValuesTesting, {
                "<= 04": 0,
                "05-14": 0,
                "15-24": 0,
                "25-34": 0,
                "35-44": 0,
                "45-54": 0,
                "55-64": 0,
                "65-74": 0,
                "75-84": 0,
                ">= 85": 0,
                TOTAL: 0
            });
        });

        // recreate singleton, since the calibrator changes things
        Modifications.setInstanceFromValues(modificationValues);

        const modelStateIntegrator = await ModelImplRoot.setupInstance(Demographics.getInstance(), Modifications.getInstance(), BaseData.getInstance(), modelProgress => {
            ctx.postMessage(modelProgress);
        });

        const minInstant = ModelConstants.MODEL_MIN_____INSTANT;
        const maxInstant = ModelConstants.MODEL_MAX_____INSTANT;
        modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER____DAY === 0, modelProgress => {
            ctx.postMessage(modelProgress);
        });

    } catch (error: any) {
        Logger.getInstance().log('failed to work due to: ', error);
    }

});

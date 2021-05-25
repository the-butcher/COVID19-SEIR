import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { IWorkerInput } from './model/IWorkerInput';
import { ModelConstants } from './model/ModelConstants';
import { ModelImplRoot } from './model/ModelImplRoot';
import { Logger } from './util/Logger';
import { TimeUtil } from './util/TimeUtil';

const ctx: Worker = self as any;

// We send a message back to the main thread
ctx.addEventListener("message", async (event: MessageEvent) => {

    Logger.setInstance(self.console.log);

    const workerInput: IWorkerInput = event.data;
    const demographicsConfig = workerInput.demographicsConfig;
    const modificationValues = workerInput.modificationValues;

    // create a demographics singleton (in worker scope, this does not interfere with main scope)
    Demographics.setInstanceFromConfig(demographicsConfig);

    // create a modifications single (in worker scope, this does not interfere with main scope)
    Modifications.setInstanceFromValues(modificationValues);

    const modelStateIntegrator = await ModelImplRoot.setupInstance(Demographics.getInstance(), Modifications.getInstance(), modelProgress => {
        ctx.postMessage(modelProgress);
    });

    const minInstant = ModelConstants.MODEL_MIN_____INSTANT;
    const maxInstant = ModelConstants.MODEL_MAX_____INSTANT;
    modelStateIntegrator.buildModelData(maxInstant, curInstant => curInstant % TimeUtil.MILLISECONDS_PER_DAY === 0, modelProgress => {
        ctx.postMessage(modelProgress);
    });

});

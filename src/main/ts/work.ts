import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { IWorkerInput } from './model/IWorkerInput';
import { ModelConstants } from './model/ModelConstants';
import { ModelImplRoot } from './model/ModelImplRoot';
import { Logger } from './util/Logger';

const ctx: Worker = self as any;

// We send a message back to the main thread
ctx.addEventListener("message", async (event: MessageEvent) => {

    self.console.log('worker received a message');
    Logger.setInstance(self.console.log);

    const workerInput: IWorkerInput = event.data;
    const demographicsConfig = workerInput.demographicsConfig;
    const modificationValues = workerInput.modificationValues;

    // create a demographics singleton (in worker scope)
    Demographics.setInstanceFromConfig(demographicsConfig);
    const demographics = Demographics.getInstance();

    // create a modifications single (in worker scope)
    Modifications.setInstanceFromValues(modificationValues);
    const modifications = Modifications.getInstance();

    const modelStateIntegrator = await ModelImplRoot.setupInstance(demographics, modifications);
    Logger.getInstance().log('modelStateIntegrator', modelStateIntegrator);

    const minInstant = ModelConstants.MODEL_MIN____________INSTANT;
    const maxInstant = ModelConstants.MODEL_MAX____________INSTANT;
    modelStateIntegrator.buildModelData(demographics, minInstant, maxInstant, modelProgress => {
        ctx.postMessage(modelProgress);
    });

});

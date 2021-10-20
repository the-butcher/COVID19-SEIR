import { ContactAdapterMultiplier } from './model/state/ContactAdapterMultiplier';
import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';


// for (let val = -0.5; val <= 0.5; val+= 0.01) {
//     console.log(val.toFixed(4), ContactAdapter.calculateSolveRateM(val).toFixed(4));
// }

/**
 *
 * go modification by modification
 *
 *
 * iterate until some criteria is met (i.e. a case offset rate lower than )
 *   adjust other to best fit (up to next modification)
 *   adjust school and nursing to best fit 05-14 and >= 85 respectively
 *
 */

StorageUtil.getInstance().loadConfig().then(modelConfig => {
    BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
        Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

            Logger.setInstance(console.log);

            ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
            Modifications.setInstanceFromValues(modelConfig.model_modifications);

            // needs model-instants to be ready
            BaseData.getInstance().calculateDailyStats();

            // initialize model mode
            ModelActions.getInstance();

            setTimeout(() => {
                ModelActions.getInstance().toggleModelMode('CONTACT');
                ModelActions.getInstance().toggleChartMode('INCIDENCE');
                ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length);
                requestAnimationFrame(() => {

                    ChartAgeGroup.getInstance().setAgeGroupIndex(Demographics.getInstance().getAgeGroups().length); // effectively set it to TOTAL
                    ControlsConstants.MODIFICATION_PARAMS['STRAIN'].handleModificationUpdate();

                });
            }, 250);

        }).catch(e => {
            console.warn('failed to load demographics data due to', e);
        });
    }).catch(e => {
        console.warn('failed to load base data due to', e);
    });
}).catch(e => {
    console.warn('failed to create model config due to', e);
});


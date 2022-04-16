import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';
import { StrainUtil } from './util/StrainUtil';

[0.00001, 0.004, 0.006, 0.01].forEach(v => {
    const log = Math.log10(v);
    const min = Math.pow(10, Math.floor(log - 1));
    const max = Math.pow(10, Math.ceil(log + 1));
    const tick = Math.pow(10, Math.round(log - 2));
    console.log(v, Math.round(Math.log10(v)), min, max, tick)
});



StorageUtil.getInstance().loadConfig().then(modelConfig => {
    BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
        Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

            Logger.setInstance(console.log);

            ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
            Modifications.setInstanceFromValues(modelConfig.model_modifications);

            // needs model-instants to be ready
            BaseData.getInstance().calculateDailyStats();

            // initialize model mode
            ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length, false);
            ModelActions.getInstance().toggleCategory('other', false);
            ModelActions.getInstance().toggleVaccKey('v1', false);
            ModelActions.getInstance().toggleModelMode('CONTACT');

            setTimeout(() => {
                ModelActions.getInstance().toggleChartMode('INCIDENCE');
                requestAnimationFrame(() => {
                    ChartAgeGroup.getInstance().renderBaseData().then(() => {
                        ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length, true);
                        ControlsConstants.MODIFICATION_PARAMS['CONTACT'].handleModificationUpdate();
                    });
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


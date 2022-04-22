import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { IModificationValuesSettings } from './common/modification/IModificationValuesSettings';
import { Modifications } from './common/modification/Modifications';
import { ModificationSettings } from './common/modification/ModificationSettings';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';

StorageUtil.getInstance().loadConfig().then(modelConfig => {

    const modificationValuesSettings = modelConfig.model_modifications.find(m => m.key === 'SETTINGS') as IModificationValuesSettings;
    ModificationSettings.setupInstance(modificationValuesSettings);

    BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
        Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

            Logger.setInstance(console.log);

            ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
            Modifications.setInstanceFromValues(modelConfig.model_modifications);

            // needs model-instants to be ready
            BaseData.getInstance().calculateDailyStats();

            // initialize model mode
            ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length, false);
            // ModelActions.getInstance().toggleVaccKey('v1', false);
            // ModelActions.getInstance().toggleCategory('other', false);
            ModelActions.getInstance().toggleModelMode('CONTACT');

            setTimeout(() => {
                ModelActions.getInstance().toggleChartMode('INCIDENCE');
                requestAnimationFrame(() => {
                    ChartAgeGroup.getInstance().renderBaseData().then(() => {
                        ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length, true);
                        ModelActions.getInstance().toggleVaccKey('v1', false);
                        ModelActions.getInstance().toggleCategory('other', false);
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


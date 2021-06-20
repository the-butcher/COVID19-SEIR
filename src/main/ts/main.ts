import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';

const modelConfig = StorageUtil.getInstance().loadConfig();
BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
    Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

        Logger.setInstance(console.log);

        ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
        Modifications.setInstanceFromValues(modelConfig.model_modifications);

        // initialize model mode
        ModelActions.getInstance();

        setTimeout(() => {
            ModelActions.getInstance().toggleModelMode('STRAIN');
            ModelActions.getInstance().toggleChartMode('INCIDENCE');
            requestAnimationFrame(() => {
                ChartAgeGroup.getInstance();
                ControlsConstants.MODIFICATION_PARAMS['STRAIN'].handleModificationUpdate();
            });
        }, 250);

    });

}).catch(e => {
    console.warn('failed to create model settings due to', e);
});


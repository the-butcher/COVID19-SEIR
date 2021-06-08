import { IncidenceData } from './model/incidence/IncidenceData';
import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { StorageUtil } from './client/controls/StorageUtil';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { JsonLoader } from './util/JsonLoader';
import { Logger } from './util/Logger';
import { ObjectUtil } from './util/ObjectUtil';

new JsonLoader().load(`data/model2-data-at.json?cb=${ObjectUtil.createId()}`).then(demographicsConfig => {

    new JsonLoader().load(`data/heatmap-data-at.json?cb=${ObjectUtil.createId()}`).then(heatmapConfig => {
        IncidenceData.setupInstance(heatmapConfig);
    });

    Logger.setInstance(console.log);

    const modificationValues = StorageUtil.getInstance().loadModifications();

    Demographics.setInstanceFromConfig(demographicsConfig);
    Modifications.setInstanceFromValues(modificationValues);

    // initialize model mode
    ModelActions.getInstance();

    setTimeout(() => {
        ModelActions.getInstance().toggleMode('STRAIN');
        requestAnimationFrame(() => {
            ChartAgeGroup.getInstance();
            ControlsConstants.MODIFICATION_PARAMS['STRAIN'].handleModificationUpdate();
        });
    }, 250);

}).catch(e => {
    console.warn('failed to create model settings due to', e);
});


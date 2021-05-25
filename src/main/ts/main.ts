import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { StorageUtil } from './client/controls/StorageUtil';
import { ModelActions } from './client/gui/ModelActions';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { JsonLoader } from './util/JsonLoader';
import { Logger } from './util/Logger';
import { ObjectUtil } from './util/ObjectUtil';


new JsonLoader().load(`data/model2-data-at.json?cb=${ObjectUtil.createId()}`).then(demographicsConfig => {

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
        });
    }, 250);

    // http://www.covidsim.de/assets/data/coma16/Austria.json

}).catch(e => {
    console.warn('failed to create model settings due to', e);
});


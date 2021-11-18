import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';

// console.log('pos     disc')
// for (let positivityRate = 0.00; positivityRate <= 0.9; positivityRate += 0.01) {
//     console.log(positivityRate.toFixed(4).padStart(7, ' '), '   ', StrainUtil.calculateDiscoveryRate(positivityRate).toFixed(4).padStart(7, ' '))
// }

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


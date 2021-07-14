import { TimeUtil } from './util/TimeUtil';
import { StrainUtil } from './util/StrainUtil';
import { IconBezierHandle } from './client/gui/IconBezierHandle';
import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/calibration/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';

StorageUtil.getInstance().loadConfig().then(modelConfig => {
    BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
        Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

            Logger.setInstance(console.log);

            // const pop = 17282163;
            // const instantA = new Date('2021-07-04').getTime();
            // const valueA = 1211;
            // const instantB = new Date('2021-07-10').getTime();
            // const valueB = 10345;
            // const r0 = StrainUtil.calculateR0(valueA, valueB, instantA, instantB, 1);
            // console.log('r0', r0);
            // for (let instantB = instantA; instantB <= new Date('2021-07-17').getTime(); instantB += TimeUtil.MILLISECONDS_PER____DAY) {
            //     const expectedCasesB = StrainUtil.calculateValueB(valueA, r0, instantA, instantB, 1);
            //     let incidence = -1;
            //     // if ((instantB - instantA) >= TimeUtil.MILLISECONDS_PER___WEEK) {
            //         const expectedCasesA = StrainUtil.calculateValueB(535, r0, instantA, instantB - TimeUtil.MILLISECONDS_PER___WEEK, 1);
            //         incidence = (expectedCasesB - expectedCasesA) * 100000 / pop;
            //     // }
            //     console.log(new Date(instantB), expectedCasesB, incidence);
            // }

            ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
            Modifications.setInstanceFromValues(modelConfig.model_modifications);

            // initialize model mode
            ModelActions.getInstance();

            setTimeout(() => {
                ModelActions.getInstance().toggleModelMode('CONTACT');
                ModelActions.getInstance().toggleChartMode('INCIDENCE');
                ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length);
                requestAnimationFrame(() => {
                    ChartAgeGroup.getInstance();
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



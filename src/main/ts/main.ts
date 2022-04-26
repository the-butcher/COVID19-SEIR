import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { IModificationValuesSettings } from './common/modification/IModificationValuesSettings';
import { ModificationResolverContact } from './common/modification/ModificationResolverContact';
import { Modifications } from './common/modification/Modifications';
import { ModificationSettings } from './common/modification/ModificationSettings';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { ILoessInput, ValueRegressionBase } from './model/regression/ValueRegressionBase';
import { Logger } from './util/Logger';
import { TimeUtil } from './util/TimeUtil';

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


            // const instantMin = ModelInstants.getInstance().getMinInstant();
            // const instantMax = ModelInstants.getInstance().getMaxInstant();
            // let instantMaxData = 0;

            // const xI: number[] = [];
            // const yH: number[] = [];
            // const yW: number[] = [];
            // const yO: number[] = [];

            // for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
            //     const dataItem = BaseData.getInstance().findBaseDataItem(instant, false);
            //     if (dataItem && dataItem.getAverageMobilityHome()) {
            //         xI.push(ValueRegressionBase.toRegressionX(dataItem.getInstant()));
            //         yH.push(dataItem.getAverageMobilityHome());
            //         yW.push(dataItem.getAverageMobilityWork());
            //         yO.push(dataItem.getAverageMobilityOther());
            //         instantMaxData = dataItem.getInstant();
            //     }
            // }

            // const loessDef = {
            //     span: 0.250,
            //     band: 0.50
            // };

            // var Loess = require('loess');

            // const xP: number[] = [];
            // const modificationsContact = new ModificationResolverContact().getModifications();
            // modificationsContact.forEach(modificationContact => {
            //     xP.push(ValueRegressionBase.toRegressionX(modificationContact.getInstantA()));
            //     if (modificationContact.getInstant() > instantMaxData) {
            //         console.log(TimeUtil.formatCategoryDateFull(modificationContact.getInstantA()));
            //         xI.push(ValueRegressionBase.toRegressionX(modificationContact.getInstantA()));
            //         yH.push(modificationContact.getCategoryValue('family'));
            //         yW.push(modificationContact.getCategoryValue('work'));
            //         yO.push(modificationContact.getCategoryValue('other'));
            //     }
            // });

            // const predictionInput = {
            //     x: xP
            // };
            // const predictionH = new Loess.default({
            //     x: xI,
            //     y: yH
            // }, loessDef).predict(predictionInput);
            // const predictionW = new Loess.default({
            //     x: xI,
            //     y: yW
            // }, loessDef).predict(predictionInput);
            // const predictionO = new Loess.default({
            //     x: xI,
            //     y: yO
            // }, loessDef).predict(predictionInput);

            // for (let i = 0; i < modificationsContact.length; i++) {
            //     if (modificationsContact[i].getInstant() <= instantMaxData) {

            //         modificationsContact[i].acceptUpdate({
            //             multipliers: {
            //                 'family': predictionH.fitted[i],
            //                 'work': predictionW.fitted[i],
            //                 'school': predictionW.fitted[i],
            //                 'other': predictionO.fitted[i],
            //                 'nursing': predictionH.fitted[i] * 0.6 + predictionO.fitted[i] * 0.2
            //             }
            //         })

            //     }
            // }

            // initialize model mode
            ModelActions.getInstance().toggleAgeGroup(Demographics.getInstance().getAgeGroups().length, false);
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


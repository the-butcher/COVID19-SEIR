import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { IRegressionConfig } from './common/modification/IModificationValuesRegression';
import { IModificationValuesSettings } from './common/modification/IModificationValuesSettings';
import { ModificationResolverContact } from './common/modification/ModificationResolverContact';
import { ModificationResolverDiscovery } from './common/modification/ModificationResolverDiscovery';
import { ModificationResolverRegression } from './common/modification/ModificationResolverRegression';
import { Modifications } from './common/modification/Modifications';
import { ModificationSettings } from './common/modification/ModificationSettings';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { ValueRegressionBase } from './model/regression/ValueRegressionBase';
import { Logger } from './util/Logger';
import { TimeUtil } from './util/TimeUtil';

/**
 * parameters that are kept in the code (and may be incorporated into the configuration at a later time)
 *
 * - variant takeover dates in ModelStateFitter~260
 * - variant shares measured from ellings graphics BaseData~290
 * - global contact matrix correction Demographics~85
 * - global undedected ModelImplStrain~55
 * - global vacc ratios ModelImplRoot~95
 *
 * s
 */

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

            const recreateDiscoveryModificationsAfterLastValidDate = false;
            if (recreateDiscoveryModificationsAfterLastValidDate) {

                const lastValidDiscoveryInstant = BaseData.getInstance().getLastValidInstant() - TimeUtil.MILLISECONDS_PER____DAY * 4;
                const modificationResolverDiscovery = new ModificationResolverDiscovery();

                const modificationsDiscoveryDeletable = modificationResolverDiscovery.getModifications().filter(m => m.getInstantA() > lastValidDiscoveryInstant);
                console.log('last valid discovery', TimeUtil.formatCategoryDateFull(lastValidDiscoveryInstant), modificationsDiscoveryDeletable);
                modificationsDiscoveryDeletable.forEach(modificationDiscoveryDeletable => {
                    Modifications.getInstance().deleteModification(modificationDiscoveryDeletable.getId());
                });

                const instantMin = lastValidDiscoveryInstant + TimeUtil.MILLISECONDS_PER____DAY * 4;
                const instantMax = ModelInstants.getInstance().getMaxInstant();
                for (let instant = instantMin; instant < instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY * 3) {
                    const modificationDiscoveryInsertable = modificationResolverDiscovery.getModification(instant, 'INTERPOLATE');
                    console.log('insert discovery', TimeUtil.formatCategoryDateFull(instant), modificationDiscoveryInsertable.getId(), modificationDiscoveryInsertable);
                    // modificationDiscoveryInsertable.acceptUpdate({
                    //     testRate: 0.03
                    // })
                    Modifications.getInstance().addModification(modificationDiscoveryInsertable);
                }

            }

            // const snapLastCorrectionToLongTermRegression = false;
            // if (snapLastCorrectionToLongTermRegression) {

            //     const modificationsContact = new ModificationResolverContact().getModifications();
            //     const lastModificationContact = modificationsContact[modificationsContact.length - 1];

            //     const modificationRegression = new ModificationResolverRegression().getModifications()[0];
            //     const correction_configs: { [K in string]: IRegressionConfig } = {};
            //     const corrections: { [K in string]: number } = {};

            //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            //         correction_configs[ageGroup.getName()] = {
            //             back_days_a: -35,
            //             back_days_b: 21,
            //             poly_shares: [
            //                 0.75,
            //                 0.25
            //             ]
            //         }
            //         // console.log(ageGroup.getName(), modificationRegression.getCorrectionRegression(lastModificationContact.getInstant(), ageGroup.getName()));
            //         corrections[ageGroup.getName()] = modificationRegression.getCorrectionRegression(lastModificationContact.getInstant(), ageGroup.getName()).regression;
            //     });

            //     modificationRegression.acceptUpdate({
            //         correction_configs
            //     });
            //     lastModificationContact.acceptUpdate({
            //         corrections
            //     });

            // }

            // const snapAllCorrectionsToMidTermRegression = false;
            // if (snapAllCorrectionsToMidTermRegression) {

            //     const modificationsContact = new ModificationResolverContact().getModifications();
            //     // const lastModificationContact = modificationsContact[modificationsContact.length - 1];

            //     const modificationRegression = new ModificationResolverRegression().getModifications()[0];
            //     const correction_configs: { [K in string]: IRegressionConfig } = {};


            //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            //         correction_configs[ageGroup.getName()] = {
            //             back_days_a: -35,
            //             back_days_b: 100,
            //             poly_shares: [
            //                 0.25,
            //                 0.75
            //             ]
            //         }
            //         // console.log(ageGroup.getName(), modificationRegression.getCorrectionRegression(lastModificationContact.getInstant(), ageGroup.getName()));

            //     });

            //     modificationRegression.acceptUpdate({
            //         correction_configs
            //     });
            //     modificationsContact.forEach(modificationContact => {
            //         const corrections: { [K in string]: number } = {};
            //         Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            //             corrections[ageGroup.getName()] = modificationRegression.getCorrectionRegression(modificationContact.getInstant(), ageGroup.getName()).loess.y;
            //         });
            //         modificationContact.acceptUpdate({
            //             corrections
            //         });
            //     });

            // }

            // const modificationsContact = new ModificationResolverContact().getModifications();
            // modificationsContact.shift();
            // modificationsContact.forEach(modificationContact => {
            //     modificationContact.acceptUpdate({
            //         instant: modificationContact.getInstant() + TimeUtil.MILLISECONDS_PER____DAY
            //     });
            // });

            const snapContactMultipliersToGoogleContact = false;
            if (snapContactMultipliersToGoogleContact) {

                const instantMin = ModelInstants.getInstance().getMinInstant();
                const instantMax = ModelInstants.getInstance().getMaxInstant();
                let instantMaxData = 0;

                const xI: number[] = [];
                const yH: number[] = [];
                const yW: number[] = [];
                const yO: number[] = [];

                for (let instant = instantMin; instant <= instantMax; instant += TimeUtil.MILLISECONDS_PER____DAY) {
                    const dataItem = BaseData.getInstance().findBaseDataItem(instant, false);
                    if (dataItem && dataItem.getMobilityHome()) {
                        xI.push(ValueRegressionBase.toRegressionX(dataItem.getInstant()));
                        yH.push(dataItem.getMobilityHome());
                        yW.push(dataItem.getMobilityWork());
                        yO.push(dataItem.getMobilityOther());
                        instantMaxData = dataItem.getInstant();
                    }
                }

                const loessDef = {
                    span: 0.125,
                    band: 0.25
                };

                var Loess = require('loess');

                const xP: number[] = [];
                const modificationsContact = new ModificationResolverContact().getModifications();
                modificationsContact.forEach(modificationContact => {
                    xP.push(ValueRegressionBase.toRegressionX(modificationContact.getInstantA()));
                    if (modificationContact.getInstant() > instantMaxData) {
                        console.log(TimeUtil.formatCategoryDateFull(modificationContact.getInstantA()));
                        xI.push(ValueRegressionBase.toRegressionX(modificationContact.getInstantA()));
                        yH.push(modificationContact.getCategoryValue('family'));
                        yW.push(modificationContact.getCategoryValue('work'));
                        yO.push(modificationContact.getCategoryValue('other'));
                    }
                });

                const predictionInput = {
                    x: xP
                };
                const predictionH = new Loess.default({
                    x: xI,
                    y: yH
                }, loessDef).predict(predictionInput);
                const predictionW = new Loess.default({
                    x: xI,
                    y: yW
                }, loessDef).predict(predictionInput);
                const predictionO = new Loess.default({
                    x: xI,
                    y: yO
                }, loessDef).predict(predictionInput);

                for (let i = 0; i < modificationsContact.length; i++) {
                    if (modificationsContact[i].getInstant() <= instantMaxData) {

                        modificationsContact[i].acceptUpdate({
                            multipliers: {
                                'family': predictionH.fitted[i],
                                'work': predictionW.fitted[i],
                                // 'school': predictionW.fitted[i],
                                'other': predictionO.fitted[i],
                                // 'nursing': predictionH.fitted[i] * 0.6 + predictionO.fitted[i] * 0.2
                            }
                        })

                    }
                }

            }

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


import { TimeUtil } from './util/TimeUtil';
import { ValueAdaptorMultiplier } from './model/state/ValueAdaptorMultiplier';
import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';
import { ModificationResolverContact } from './common/modification/ModificationResolverContact';
import { IModificationValuesContact } from './common/modification/IModificationValuesContact';


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

            const modificationsContact = new ModificationResolverContact().getModifications();

            const adaptedValues: { [K in string]: Partial<IModificationValuesContact> } = {};
            for (let i = 0; i<modificationsContact.length - 3; i+=2) {

                // build multipliers for each category
                const multipliers1: { [K in string]: number } = {};
                const multipliers2: { [K in string]: number } = {};
                Demographics.getInstance().getCategories().forEach(category => {

                    // line A (upper or lower, not necessarily important to know)
                    const mod0 = modificationsContact[i].getCategoryValue(category.getName());

                    // line B
                    const mod1 = modificationsContact[i + 1].getCategoryValue(category.getName());

                    // line A (upper or lower, not necessarily important to know)
                    const mod2 = modificationsContact[i + 2].getCategoryValue(category.getName());

                    // line B
                    const mod3 = modificationsContact[i + 3].getCategoryValue(category.getName());

                    const mid02 = mod0 + (mod2 - mod0) / 2;
                    multipliers1[category.getName()] = (mod1 + (mid02 - mod1) / 2);

                    const mid13 = mod1 + (mod3 - mod1) / 2;
                    multipliers2[category.getName()] = (mod2 + (mid13 - mod2) / 2);

                });

                const corrections1: { [K in string]: number } = {};
                const corrections2: { [K in string]: number } = {};
                Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

                    // line A (upper or lower, not necessarily important to know)
                    const mod0 = modificationsContact[i].getCorrectionValue('other', ageGroup.getIndex());

                    // line B
                    const mod1 = modificationsContact[i + 1].getCorrectionValue('other', ageGroup.getIndex());

                    // line A (upper or lower, not necessarily important to know)
                    const mod2 = modificationsContact[i + 2].getCorrectionValue('other', ageGroup.getIndex());

                    // line B
                    const mod3 = modificationsContact[i + 3].getCorrectionValue('other', ageGroup.getIndex());

                    const mid02 = mod0 + (mod2 - mod0) / 2;
                    corrections1[ageGroup.getName()] = (mod1 + (mid02 - mod1) / 2);

                    const mid13 = mod1 + (mod3 - mod1) / 2;
                    corrections2[ageGroup.getName()] = (mod2 + (mid13 - mod2) / 2);

                });

                // create modification values by modification id
                adaptedValues[modificationsContact[i + 1].getId()] = {
                    multipliers: multipliers1,
                    corrections: {
                        'family': corrections1,
                        'school': corrections1,
                        'nursing': corrections1,
                        'work': corrections1,
                        'other': corrections1,
                    }
                }
                adaptedValues[modificationsContact[i + 2].getId()] = {
                    multipliers: multipliers2,
                    corrections: {
                        'family': corrections2,
                        'school': corrections2,
                        'nursing': corrections2,
                        'work': corrections2,
                        'other': corrections2,
                    }
                }

            }

            for (let i = 0; i<modificationsContact.length - 3; i+=2) {

                modificationsContact[i + 1].acceptUpdate(adaptedValues[modificationsContact[i + 1].getId()]);
                modificationsContact[i + 2].acceptUpdate(adaptedValues[modificationsContact[i + 2].getId()]);

            }



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


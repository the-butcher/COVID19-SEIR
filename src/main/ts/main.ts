import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ControlsConstants } from './client/gui/ControlsConstants';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { IModificationValuesContact } from './common/modification/IModificationValuesContact';
import { ModificationResolverContact } from './common/modification/ModificationResolverContact';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';

StorageUtil.getInstance().loadConfig().then(modelConfig => {
    BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
        Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

            Logger.setInstance(console.log);

            ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
            Modifications.setInstanceFromValues(modelConfig.model_modifications);

            // const modificationsContact = new ModificationResolverContact().getModifications();

            // const adaptedValues: { [K in string]: Partial<IModificationValuesContact> } = {};
            // for (let i = 3; i<modificationsContact.length - 3; i+=2) {

            //     // build multipliers for each category
            //     const multipliers1: { [K in string]: number } = {};
            //     const multipliers2: { [K in string]: number } = {};
            //     Demographics.getInstance().getCategories().forEach(category => {

            //         // line A
            //         const mod0 = modificationsContact[i].getCategoryValue(category.getName());

            //         // line B (a value that may be an outlier)
            //         const mod1 = modificationsContact[i + 1].getCategoryValue(category.getName());

            //         // line A (a value that may be an outlier)
            //         const mod2 = modificationsContact[i + 2].getCategoryValue(category.getName());

            //         // line B
            //         const mod3 = modificationsContact[i + 3].getCategoryValue(category.getName());

            //         // midpoint on 02
            //         const mid02 = mod0 + (mod2 - mod0) / 2;
            //         const corr1 = (mid02 - mod1) / 2;

            //         // midpoint on 13
            //         const mid13 = mod1 + (mod3 - mod1) / 2;
            //         const corr2 = (mid13 - mod2) / 2;

            //         // const mod03i = (mod2 - mod0) / 2 + (mod3 - mod1) / 2;
            //         // const mod03a = (mod2a - mod0) / 2 + (mod3 - mod1a) / 2;
            //         // const mod03d = (mod03a - mod03i);
            //         // const mod03a = (mod1a - mod0) / 2 + (mod2a - mod1a) / 2 + (mod3 - mod2a) / 2;

            //         // midpoint between old value and opposite midpoint
            //         const mod1a = mod1 + corr1;
            //         // midpoint between old value and opposite midpoint
            //         const mod2a = mod2 + corr2;

            //         multipliers1[category.getName()] = mod1a;
            //         multipliers2[category.getName()] = mod2a;

            //     });

            //     const corrections1: { [K in string]: number } = {};
            //     const corrections2: { [K in string]: number } = {};
            //     Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

            //         // line A (upper or lower, not necessarily important to know)
            //         const mod0 = modificationsContact[i].getCorrectionValue('other', ageGroup.getIndex());

            //         // line B
            //         const mod1 = modificationsContact[i + 1].getCorrectionValue('other', ageGroup.getIndex());

            //         // line A (upper or lower, not necessarily important to know)
            //         const mod2 = modificationsContact[i + 2].getCorrectionValue('other', ageGroup.getIndex());

            //         // line B
            //         const mod3 = modificationsContact[i + 3].getCorrectionValue('other', ageGroup.getIndex());

            //         // midpoint on 02
            //         const mid02 = mod0 + (mod2 - mod0) / 2;
            //         // halfway between old value and opposite midpoint
            //         const mod1a = (mod1 + (mid02 - mod1) / 2);
            //         corrections1[ageGroup.getName()] = mod1a;

            //         // midpoint on 13
            //         const mid13 = mod1 + (mod3 - mod1) / 2;
            //         // halfway between old value and opposite midpoint
            //         const mod2a = (mod2 + (mid13 - mod2) / 2);
            //         corrections2[ageGroup.getName()] = mod2a;

            //     });

            //     // create modification values by modification id
            //     adaptedValues[modificationsContact[i + 1].getId()] = {
            //         multipliers: multipliers1,
            //         corrections: {
            //             'family': corrections1,
            //             'school': corrections1,
            //             'nursing': corrections1,
            //             'work': corrections1,
            //             'other': corrections1,
            //         }
            //     }
            //     adaptedValues[modificationsContact[i + 2].getId()] = {
            //         multipliers: multipliers2,
            //         corrections: {
            //             'family': corrections2,
            //             'school': corrections2,
            //             'nursing': corrections2,
            //             'work': corrections2,
            //             'other': corrections2,
            //         }
            //     }

            // }

            // for (let i = 3; i<modificationsContact.length - 3; i+=2) {
            //     modificationsContact[i + 1].acceptUpdate(adaptedValues[modificationsContact[i + 1].getId()]);
            //     modificationsContact[i + 2].acceptUpdate(adaptedValues[modificationsContact[i + 2].getId()]);
            // }



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


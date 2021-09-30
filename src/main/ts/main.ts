import { StrainUtil } from './util/StrainUtil';
import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ModelActions } from './client/gui/ModelActions';
import { StorageUtil } from './client/storage/StorageUtil';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { BaseData } from './model/basedata/BaseData';
import { ModelInstants } from './model/ModelInstants';
import { Logger } from './util/Logger';
import { ControlsConstants } from './client/gui/ControlsConstants';

StorageUtil.getInstance().loadConfig().then(modelConfig => {
    BaseData.setInstanceFromPath(modelConfig.model______basedata).then(() => {
        Demographics.setInstanceFromPath(modelConfig.model__demographics).then(() => {

            Logger.setInstance(console.log);

            ModelInstants.setInstanceFromValues(modelConfig.model_____daterange.map(d => new Date(d).getTime()))
            Modifications.setInstanceFromValues(modelConfig.model_modifications);

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


/**
 *
 * positivity rate?
 * -- high positivity rate may mean high unknown number of cases
 *    -- lets assume that over the full pandemic for every positive test there were n undiscovered cases
 *
 *    -- a low positivity rate would mean a high percentage of cases are found
 *    -- a high positivity rate would mean a low percentage of cases is found (even though there are likely many overall cases at that time)
 *    -- should - tests per capita also play a role?
 *
 *
 *    -- example B: 1000 persons get a test, all positive --> discovery rate 100%
 *    -- example C: 1000 persons get a test, none positive --> likely discovery rate 100% (all of none)
 *    -- example D: 1000 persons get a test, 500 positive
 *
 *    -- what if a given positivity rate of
 *       -- 5% would be mapped to the base discovery rate 33% in the model
 *       -- 0% would be mapped to 100% discovery (but 0 cases actually)
 *
 * -- in "non-overall" mode
 *    -- N-percent of the cases that originated from category infection are discovered
 *       -- at the time of discovery it is not known from which categories the infections originated
 *    -- for the time of testing a contact-matrix built from seasonality/contact/susceptibility is known (susceptibility has yet to be added)
 *       -- therefore moving a testing modification to another instant will change category shares (but with which ruleset?)
 *       -- assume overall discovery is 60% (of whatever underlying contact there is)
 *          -- scs family 20000 contacts
 *          -- scs school 10000 contacts
 *          -- scs other 30000 contacts
 *          -- scs total 60% -> 36000 contacts
 *          -- tst family 80% -> 16000
 *          -- tst school 20% -> 2000
 *          -- tst other 50% -> 15000 -> now there is 3000 missing
 *          -- let category sliders be weights in this setting
 *
 */
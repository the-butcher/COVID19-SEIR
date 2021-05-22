import { ChartAgeGroup } from './client/chart/ChartAgeGroup';
import { ModelMode } from './client/gui/ModelMode';
import { Demographics } from './common/demographics/Demographics';
import { Modifications } from './common/modification/Modifications';
import { ModelConstants } from './model/ModelConstants';
import { JsonLoader } from './util/JsonLoader';
import { Logger } from './util/Logger';
import { ObjectUtil } from './util/ObjectUtil';

new JsonLoader().load(`data/model2-data-at.json?cb=${ObjectUtil.createId()}`).then(demographicsConfig => {

    Logger.setInstance(console.log);

    const modificationValues: any[] = [
        {
            id: ObjectUtil.createId(),
            key: 'SETTINGS',
            name: 'settings',
            instant: ModelConstants.MODEL_MIN____________INSTANT,
            recoveredD: 0.12,
            recoveredU: 0.12,
            vaccinated: 0.22,
            dead: 0.001
        },
        {
            id: ObjectUtil.createId(),
            key: 'TIME',
            name: 'effective settings',
            instant: ModelConstants.MODEL_MIN____________INSTANT
        },
        {
            id: ObjectUtil.createId(),
            key: 'STRAIN',
            instant: ModelConstants.MODEL_MIN____________INSTANT,
            name: 'b.1.1.7',
            r0: 4.4,
            serialInterval: 4.8,
            intervalScale: 1.0,
            incidence: 150
        },
        {
            id: ObjectUtil.createId(),
            key: 'CONTACT',
            name: 'initial NPIs',
            instant: ModelConstants.MODEL_MIN____________INSTANT,
            multipliers: {
                'family': 0.65,
                'school': 0.25,
                'nursing': 0.30,
                'work': 0.50,
                'other': 0.20,
            }
        },
        {
            id: ObjectUtil.createId(),
            key: 'TESTING',
            name: 'initial discovery',
            instant: ModelConstants.MODEL_MIN____________INSTANT,
            multipliers: {
                'family': 0.40,
                'school': 0.60,
                'nursing': 0.75,
                'work': 0.10,
                'other': 0.10
            }
        },
        {
            id: ObjectUtil.createId(),
            key: 'VACCINATION',
            name: 'initial vaccinations',
            instant: ModelConstants.MODEL_MIN____________INSTANT,
            doses: 100000
        },
        {
            id: ObjectUtil.createId(),
            key: 'SEASONALITY',
            name: 'seasonality',
            instant: new Date('2021-07-10').getTime(),
            amount: 0.90
        }
    ]

    Demographics.setInstanceFromConfig(demographicsConfig);
    Modifications.setInstanceFromValues(modificationValues);

    // initialize model mode
    ModelMode.getInstance();

    setTimeout(() => {
        ModelMode.getInstance().toggleMode('STRAIN');
        requestAnimationFrame(() => {
            ChartAgeGroup.getInstance();
        });
    }, 250);

    // document.getElementById('actionSaveDiv').addEventListener('click', e => {
    //     Modifications.getInstance().buildModificationValues();
    // });

    // http://www.covidsim.de/assets/data/coma16/Austria.json

}).catch(e => {
    console.warn('failed to create model settings due to', e);
});

/**
 * -- create some callback that will add/remove series upon creating, renaming, deleting strains
 * -- sub incidence series per strain
 * -- let the heatmap show i.e. vaccination percentages (and maybe other values)
 * -- when there is no initial strain, the model does not initialize
 * -- build model after create or delete of modification needs to be re - implemented
 * OK implement configurable seasonality
 *    OK types and slider
 *    OK visualize
 *    -- integrate into model
 *
 * -- complete the vaccination model
 *    -- plausibility
 *    OK immunization moves SUSCEPTIBLE to IMMUNIZING (5 weeks), from there to immunized ()
 *    OK immunization moves REMOVED_D to IMMUNIZED (these will move to immunized directly with a single shot)
 *    OK immunization moves REMOVED_U to IMMUNIZED (but costs 2 shots from available)
 *
 * OK from ages data, parse a decent set of values
 *    OK population sizes
 *    NO initial exposed from ages data (an estimation from incidence and slope)
 *    -- initial dead from ages data
 *
 * OK is (susceptible - 0.25) feasible for implementing acceptance threshold
 * OK implement lower acceptance of vaccination in younger age groups
 * OK add cases to the incidence diagram
 * NO have a set of initial assumptions per age group (initial exposed, initial dead) - from ages data (?)
 * OK graphic indication of selected age group in heatmap
 *
 */

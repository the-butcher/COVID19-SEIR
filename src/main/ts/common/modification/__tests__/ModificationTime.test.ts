import { describe, expect, it } from '@jest/globals';
import model2config from '../../../../webapp/data/demographics-at.json';
import model2testmodifications from '../../../../webapp/data/model-test-modifications.json';
import { ObjectUtil } from '../../../util/ObjectUtil';
import { IModificationValues } from '../IModificationValues';
import { ModelInstants } from './../../../model/ModelInstants';
import { Demographics } from './../../demographics/Demographics';
import { IDemographicsConfig } from './../../demographics/IDemographicsConfig';
import { Modifications } from './../Modifications';
import { ModificationSettings } from './../ModificationSettings';
import { ModificationTime } from './../ModificationTime';

describe("test value", () => {

    ModelInstants.setInstanceFromValues([new Date('2021-05-01').getTime(), new Date('2021-07-01').getTime()])
    Demographics.setInstanceFromConfig('test', model2config as IDemographicsConfig);
    Modifications.setInstanceFromValues(model2testmodifications as IModificationValues[]);

    it("should return 0.3 as testing ratio, 0.839 as contact multiplier", () => {
        const modificationTime = new ModificationTime({
            id: ObjectUtil.createId(),
            key: 'TESTING',
            name: 'initial discovery',
            instant: new Date('2021-05-01').getTime(),
            deletable: false,
            draggable: false
        });
        modificationTime.setInstants(1625875200000, 1625875200000);
        expect(modificationTime.getTestingRatio(0)).toBeCloseTo(0.3, 3);
        expect(modificationTime.getTestingRatio(4)).toBeCloseTo(0.3, 3);
        expect(modificationTime.getTestingRatio(9)).toBeCloseTo(0.3, 3);
        expect(modificationTime.getContactMultiplier(0)).toBeCloseTo(0.839, 3);
        expect(modificationTime.getContactMultiplier(4)).toBeCloseTo(0.839, 3);
        expect(modificationTime.getContactMultiplier(9)).toBeCloseTo(0.839, 3);
    });
    it("should return 0.5 as testing ratio, 0.7315 as contact multiplier", () => {
        const modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;
        modificationSettings.acceptUpdate({
            quarantine: 0.5
        })
        const modificationTime = new ModificationTime({
            id: ObjectUtil.createId(),
            key: 'TESTING',
            name: 'initial discovery',
            instant: new Date('2021-05-01').getTime(),
            deletable: false,
            draggable: false
        });
        modificationTime.setInstants(1625875200000, 1625875200000);
        expect(modificationTime.getTestingRatio(0)).toBeCloseTo(0.3, 3);
        expect(modificationTime.getTestingRatio(4)).toBeCloseTo(0.3, 3);
        expect(modificationTime.getTestingRatio(9)).toBeCloseTo(0.3, 3);
        expect(modificationTime.getContactMultiplier(0)).toBeCloseTo(0.9195, 3); // with less quarantine, there will be less reduction
        expect(modificationTime.getContactMultiplier(4)).toBeCloseTo(0.9195, 3);
        expect(modificationTime.getContactMultiplier(9)).toBeCloseTo(0.9195, 3);
    });


});
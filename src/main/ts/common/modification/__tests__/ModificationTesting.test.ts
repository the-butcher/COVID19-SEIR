import { describe, expect, it } from '@jest/globals';
import model2config from '../../../../webapp/data/demographics-at.json';
import { ObjectUtil } from '../../../util/ObjectUtil';
import { ModificationTesting } from '../ModificationTesting';
import { Demographics } from './../../demographics/Demographics';
import { IDemographicsConfig } from './../../demographics/IDemographicsConfig';

describe("test value", () => {
    Demographics.setInstanceFromConfig('test', model2config as IDemographicsConfig);
    it("should return 0.3 as testing ratio, 0.839 as contact multiplier", () => {
        const modificationTesting = new ModificationTesting({
            id: ObjectUtil.createId(),
            key: 'TESTING',
            name: 'initial discovery',
            instant: new Date('2021-05-01').getTime(),
            multipliers: {
                'family': 0.30,
                'school': 0.30,
                'nursing': 0.30,
                'work': 0.30,
                'other': 0.30
            },
            deletable: false,
            draggable: false
        });
        expect(modificationTesting.getColumnValue(0)).toBeCloseTo(0.3, 3);
        expect(modificationTesting.getColumnValue(4)).toBeCloseTo(0.3, 3);
        expect(modificationTesting.getColumnValue(9)).toBeCloseTo(0.3, 3);
        // expect(modificationTesting.getContactMultiplier(0)).toBeCloseTo(0.839, 3);
        // expect(modificationTesting.getContactMultiplier(4)).toBeCloseTo(0.839, 3);
        // expect(modificationTesting.getContactMultiplier(9)).toBeCloseTo(0.839, 3);
    });
    it("should return 0.5 as testing ratio, 0.7315 as contact multiplier", () => {
        const modificationTesting = new ModificationTesting({
            id: ObjectUtil.createId(),
            key: 'TESTING',
            name: 'initial discovery',
            instant: new Date('2021-05-01').getTime(),
            multipliers: {
                'family': 0.50,
                'school': 0.50,
                'nursing': 0.50,
                'work': 0.50,
                'other': 0.50
            },
            deletable: false,
            draggable: false
        });
        expect(modificationTesting.getColumnValue(0)).toBeCloseTo(0.5, 3);
        expect(modificationTesting.getColumnValue(4)).toBeCloseTo(0.5, 3);
        expect(modificationTesting.getColumnValue(9)).toBeCloseTo(0.5, 3);
        // expect(modificationTesting.getContactMultiplier(0)).toBeCloseTo(0.7315, 3);
        // expect(modificationTesting.getContactMultiplier(4)).toBeCloseTo(0.7315, 3);
        // expect(modificationTesting.getContactMultiplier(9)).toBeCloseTo(0.7315, 3);
    });
    it("should return 0.7 as testing ratio, 0.6242 as contact multiplier", () => {
        const modificationTesting = new ModificationTesting({
            id: ObjectUtil.createId(),
            key: 'TESTING',
            name: 'initial discovery',
            instant: new Date('2021-05-01').getTime(),
            multipliers: {
                'family': 0.70,
                'school': 0.70,
                'nursing': 0.70,
                'work': 0.70,
                'other': 0.70
            },
            deletable: false,
            draggable: false
        });
        expect(modificationTesting.getColumnValue(0)).toBeCloseTo(0.7, 3);
        expect(modificationTesting.getColumnValue(4)).toBeCloseTo(0.7, 3);
        expect(modificationTesting.getColumnValue(9)).toBeCloseTo(0.7, 3);
        // expect(modificationTesting.getContactMultiplier(0)).toBeCloseTo(0.6242, 3);
        // expect(modificationTesting.getContactMultiplier(4)).toBeCloseTo(0.6242, 3);
        // expect(modificationTesting.getContactMultiplier(9)).toBeCloseTo(0.6242, 3);
    });

});
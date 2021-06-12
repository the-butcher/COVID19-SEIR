import { TimeUtil } from './../TimeUtil';
import { describe, expect, it } from '@jest/globals';
import { ObjectUtil } from '../ObjectUtil';
import { StrainUtil } from '../StrainUtil';

describe("test value", () => {

    it("should return 0.75 as reproduction number", () => {
        expect(StrainUtil.calculateR0(80, 60, 0, 4.8 * TimeUtil.MILLISECONDS_PER____DAY, 4.8)).toBe(0.75);
        expect(StrainUtil.calculateR0(80, 45, 0, 4.8 * 2 * TimeUtil.MILLISECONDS_PER____DAY, 4.8)).toBe(0.75);
    });
    it("should return 60 as value", () => {
        expect(StrainUtil.calculateValueB(80, 0.75, 0, 4.8 * TimeUtil.MILLISECONDS_PER____DAY, 4.8)).toBe(60);
    });
    it("should return 45 as value", () => {
        expect(StrainUtil.calculateValueB(80, 0.75, 0, 4.8 * 2 * TimeUtil.MILLISECONDS_PER____DAY, 4.8)).toBe(45);
    });

});
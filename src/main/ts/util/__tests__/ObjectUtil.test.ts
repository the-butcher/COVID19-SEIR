import { describe, expect, it } from '@jest/globals';
import { ObjectUtil } from '../ObjectUtil';

describe("test value", () => {

    it("should return 200000 as daily vaccinations for austria", () => {
        expect(ObjectUtil.getMaxVaccinations(8900000)).toBe(200000);
        expect(ObjectUtil.getMaxVaccinations(60000000)).toBe(1000000)
    });

});
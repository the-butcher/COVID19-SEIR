import { expect, describe, it, test } from '@jest/globals';
import { ObjectUtil } from './../../../util/ObjectUtil';
import { IModificationValuesStrain } from './../../../common/modification/IModificationValuesStrain';
import { CompartmentChain } from '../CompartmentChain';
describe("test value", () => {
    it("should return 1 as reproduction value", () => {
        const compartmentParams = new CompartmentChain().getCompartmentParams();
        let totalReproduction = 0;
        compartmentParams.forEach(compartmentParam => {
            totalReproduction += compartmentParam.reproduction;
        });
        expect(totalReproduction).toBe(1);
    });
    it("should return 1 as total duration value", () => {
        const compartmentParams = new CompartmentChain().getCompartmentParams();
        let totalDuration = 0;
        compartmentParams.forEach(compartmentParam => {
            totalDuration += (compartmentParam.instantB - compartmentParam.instantA);
        });
        expect(totalDuration).toBe(1);
    });
    it("should return 3 as exposure time and 4.8 as incubation time", () => {
        const strain: IModificationValuesStrain = {
            id: ObjectUtil.createId(),
            key: 'STRAIN',
            instant: -1,
            r0: 1.0,
            intervalScale: 1.13402,
            serialInterval: 5.0,
            name: 'test',
            incidence: 1,
            deletable: true,
            draggable: true
        };
        const compartmentParams = new CompartmentChain().getStrainedCompartmentParams(strain);
        expect(compartmentParams[0].instantB).toBeCloseTo(259200000, -4);
        expect(compartmentParams[5].instantB).toBeCloseTo(526179274, -3);
    });
    it("should return r0 as reproduction value for non-scaled strain", () => {
        const strain: IModificationValuesStrain = {
            id: ObjectUtil.createId(),
            key: 'STRAIN',
            instant: -1,
            r0: 3.0,
            intervalScale: 1.0,
            serialInterval: 5.0,
            name: 'test',
            incidence: 1,
            deletable: true,
            draggable: true
        };
        const compartmentParams = new CompartmentChain().getStrainedCompartmentParams(strain);
        let totalReproduction = 0;
        compartmentParams.forEach(compartmentParam => {
            totalReproduction += compartmentParam.reproduction;
        });
        expect(totalReproduction).toBe(3);
    });
    it("should return r0 as reproduction value for scaled strain", () => {
        const strain: IModificationValuesStrain = {
            id: ObjectUtil.createId(),
            key: 'STRAIN',
            instant: -1,
            r0: 3.4,
            intervalScale: 1.25,
            serialInterval: 5.0,
            name: 'test',
            incidence: 1,
            deletable: true,
            draggable: true
        };
        const compartmentParams = new CompartmentChain().getStrainedCompartmentParams(strain);
        let totalReproduction = 0;
        compartmentParams.forEach(compartmentParam => {
            totalReproduction += compartmentParam.reproduction;
        });
        expect(totalReproduction).toBeCloseTo(3.4, 8);
    });
    it("should return 0.4631 as shareOfPresymptomaticInfection", () => {
        expect(CompartmentChain.getInstance().getShareOfPresymptomaticInfection()).toBeCloseTo(0.4631, 3);
    });

});
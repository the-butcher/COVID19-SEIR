import { IVaccinationConfig } from '../demographics/IVaccinationConfig';
import { TimeUtil } from './../../util/TimeUtil';
import { ModelImplRoot } from './../../model/ModelImplRoot';
import { deprecate } from 'util';
import { CompartmentChainReproduction } from '../../model/compartment/CompartmentChainReproduction';
import { ModelImplStrain } from '../../model/ModelImplStrain';
import { ContactCellsUtil } from '../../util/ContactCellsUtil';
import { AgeGroup } from '../demographics/AgeGroup';
import { ContactCategory } from '../demographics/ContactCategory';
import { Demographics } from './../demographics/Demographics';
import { AModification } from './AModification';
import { IContactCategories } from './IContactCategories';
import { IContactMatrix } from './IContactMatrix';
import { IModificationValuesTime } from './IModificationValuesTime';
import { ModificationContact } from './ModificationContact';
import { ModificationDiscovery } from './ModificationDiscovery';
import { ModificationResolverContact } from './ModificationResolverContact';
import { ModificationResolverDiscovery } from './ModificationResolverDiscovery';
import { ModificationResolverSeasonality } from './ModificationResolverSeasonality';
import { Modifications } from './Modifications';
import { ModificationSeasonality } from './ModificationSeasonality';
import { ModificationSettings } from './ModificationSettings';
import { ModificationVaccination } from './ModificationVaccination';
import { Dictionary } from '@amcharts/amcharts4/core';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ModificationResolverVaccination } from './ModificationResolverVaccination';

export interface IRatios {
    contact: number;
    discovery: number;
}

/**
 * implementation of IModification for a specific instant
 * the matrix-filter provided by this instance is the base for age-group specific modelling
 *
 * @author h.fleischer
 * @since 18.04.2021
 */
export class ModificationTime extends AModification<IModificationValuesTime> implements IContactMatrix, IContactCategories {

    static createInstance(instant: number): ModificationTime {
        const id = ObjectUtil.createId();
        const modificationTime = new ModificationTime({
            id,
            key: 'TIME',
            instant: instant,
            name: id,
            deletable: false,
            draggable: false
        });
        modificationTime.setInstants(instant, instant);
        return modificationTime;
    }

    // private modificationVaccination0: ModificationVaccination;

    private modificationContact: ModificationContact;
    private modificationDiscovery: ModificationDiscovery;
    private modificationVaccination: ModificationVaccination;
    private modificationSeasonality: ModificationSeasonality;
    private modificationSettings: ModificationSettings;

    private maxCellValue: number;
    private maxColumnValue: number;
    private valueSum: number;
    private columnValues: number[];
    private cellValues: number[][];
    private discoveryRatesByAgeGroup: IRatios[];
    private quarantineMultipliersByAgeGroup: number[];
    // private discoveryRateOverall: number;
    // private positivityRateInjected: number;

    private readonly ageGroups: AgeGroup[];
    private readonly ageGroupIndexTotal: number;
    private readonly contactCategories: ContactCategory[];
    private readonly absTotal: number;

    constructor(modificationParams: IModificationValuesTime) {
        super('INSTANT', modificationParams);
        this.ageGroups = [...Demographics.getInstance().getAgeGroups()];
        this.ageGroupIndexTotal = Demographics.getInstance().getAgeGroupTotal().getIndex();
        this.contactCategories = [...Demographics.getInstance().getCategories()];
        this.absTotal = Demographics.getInstance().getAbsTotal();
        this.resetValues();
    }

    getCategories(): ContactCategory[] {
        return this.contactCategories;
    }

    logSummary(): void {
        // do nothing
    }

    acceptUpdate(update: Partial<IModificationValuesTime>): void {
        super.acceptUpdate(update); // title is updateable
    }

    /**
     * TODO there should be a test for this
     * must be instant A (the underlying contact modification may have a different time, while still applying to this instance)
     * @returns
     */
    getInstant(): number {
        return this.getInstantA();
    }

    /**
     * no model update required
     * @param instantA
     * @param instantB
     */
    setInstants(instantA: number, instantB: number): void {

        super.setInstants(instantA, instantB);
        this.modificationContact = new ModificationResolverContact().getModification(this.getInstantA(), 'INTERPOLATE');
        this.modificationDiscovery = new ModificationResolverDiscovery().getModification(this.getInstantA(), 'INTERPOLATE');

        // vaccinations for this instant / for a day previous
        const modificationResolverVaccination = new ModificationResolverVaccination();
        this.modificationVaccination = modificationResolverVaccination.getModification(this.getInstantA(), 'INTERPOLATE');

        this.modificationSeasonality = new ModificationResolverSeasonality().getModification(this.getInstantA(), 'INTERPOLATE');
        this.modificationSettings = Modifications.getInstance().findModificationsByType('SETTINGS')[0] as ModificationSettings;
        this.resetValues();

    }

    getVaccinationConfig2(ageGroup: string): IVaccinationConfig {
        return this.modificationVaccination.getVaccinationConfig(ageGroup);
    }

    getReexposure(): number {
        return this.modificationSettings.getReexposure();
    }

    resetValues(): void {

        this.maxCellValue = -1;
        this.maxColumnValue = -1;
        this.valueSum = -1;
        this.columnValues = [];
        this.discoveryRatesByAgeGroup = undefined;
        this.quarantineMultipliersByAgeGroup = undefined;
        this.cellValues = [];
        for (let indexContact = 0; indexContact < this.ageGroups.length; indexContact++) {
            this.columnValues[indexContact] = -1;
        }

    }

    getSeasonality(): number {
        return this.modificationSeasonality.getSeasonality();
    }

    getDiscoveryRatesRaw(ageGroupIndex: number): IRatios {
        if (!this.discoveryRatesByAgeGroup) {
            this.buildRates();
        }
        return this.discoveryRatesByAgeGroup[ageGroupIndex];
    }

    getDiscoveryRateLoess(ageGroupIndex: number): number {
        return ModificationResolverDiscovery.getRegression(ageGroupIndex).findLoessValue(this.getInstant()).y;
    }


    // getDiscoveryRateTotal(): number {
    //     if (!this.discoveryRatesByAgeGroup) {
    //         this.buildRates();
    //     }
    //     return this.discoveryRateOverall;
    // }

    private buildRates(): void {

        this.discoveryRatesByAgeGroup = [];
        this.quarantineMultipliersByAgeGroup = [];

        const shareOfInfectionBeforeIncubation = CompartmentChainReproduction.getInstance().getShareOfPresymptomaticInfection();
        const shareOfInfectionAfterIncubation = 1 - shareOfInfectionBeforeIncubation;

        this.ageGroups.forEach(ageGroup => {

            const ageGroupIndex = ageGroup.getIndex();
            let contactTotal = 0;
            let discoveryRateAgeGroup = 0;

            this.contactCategories.forEach(contactCategory => {

                // current contact ratio for that contact category as set in modification (0% to 100%)
                const contactRatioCategory = this.modificationContact.getCategoryValue(contactCategory.getName());
                // total contact in the requested age group in contact category (TODO - question this value)
                const contactGroupCategory = contactCategory.getColumnValue(ageGroupIndex);
                // current total contact as of base contact-rate and contact-ratio in contact category
                const contactTotalCategory = contactRatioCategory * contactGroupCategory;

                // current discovery setting for category as set in modification
                let discoveryRateCategory = this.modificationDiscovery.getCategoryValue(contactCategory.getName());

                if (ageGroup.getIndex() == 0) {
                    discoveryRateCategory *= 0.6;
                } else if (ageGroup.getIndex() == 3 || ageGroup.getIndex() == 4) {
                    discoveryRateCategory *= 1.1;
                }

                // current share of discovered in currentTotal
                contactTotal += contactTotalCategory;
                discoveryRateAgeGroup += discoveryRateCategory * contactTotalCategory;

            });

            this.discoveryRatesByAgeGroup[ageGroupIndex] = {
                contact: contactTotal,
                discovery: discoveryRateAgeGroup / contactTotal
            };



        });

        let _discoveryRateOverall = 0;
        this.ageGroups.forEach(ageGroup => {
            _discoveryRateOverall += ageGroup.getAbsValue() * this.discoveryRatesByAgeGroup[ageGroup.getIndex()].discovery;
        });
        _discoveryRateOverall = _discoveryRateOverall / this.absTotal;

        const correction = this.calculateDiscoveryRateOverall() / _discoveryRateOverall;
        this.ageGroups.forEach(ageGroup => {

            const ageGroupIndex = ageGroup.getIndex();
            let contact = this.discoveryRatesByAgeGroup[ageGroupIndex].contact * correction;
            let discovery = Math.min(1.0, this.discoveryRatesByAgeGroup[ageGroupIndex].discovery * correction);
            this.discoveryRatesByAgeGroup[ageGroup.getIndex()] = {
                contact,
                discovery
            };
            this.quarantineMultipliersByAgeGroup[ageGroupIndex] = shareOfInfectionBeforeIncubation + shareOfInfectionAfterIncubation * (1 - discovery * this.modificationSettings.getQuarantine(ageGroupIndex));

        });
        this.discoveryRatesByAgeGroup[this.ageGroupIndexTotal] = {
            contact: -1,
            discovery: this.calculateDiscoveryRateOverall()
        }
        // this.discoveryRateOverall = this.calculateDiscoveryRateOverall();

    }

    injectPositivityRate(positivityRate: number): void {
        // console.log('injecting to', this.modificationDiscovery.getId(), this.modificationDiscovery.getName());
        this.modificationDiscovery.acceptUpdate({
            positivityRate
        });
    }

    private calculateDiscoveryRateOverall(): number {
        const testRate = this.getTestRate();
        const positivityRate = this.getPositivityRate();
        if (testRate && positivityRate) {
            return ModificationSettings.getInstance().calculateDiscoveryRate(positivityRate, testRate);
        } else {
            Math.random();
        }
    }

    getPositivityRate(): number {
        return this.modificationDiscovery.getPositivityRate();
    }

    getTestRate(): number {
        return this.modificationDiscovery.getTestRate();
    }


    getQuarantineMultiplier(ageGroupIndex: number): number {
        if (!this.quarantineMultipliersByAgeGroup) {
            this.buildRates();
        }
        return this.quarantineMultipliersByAgeGroup[ageGroupIndex];
    }

    getCellValue(indexContact: number, indexParticipant: number): number {

        if (!this.cellValues[indexContact]) {
            this.cellValues[indexContact] = [];
        }

        if (!this.cellValues[indexContact][indexParticipant]) {

            /**
             * reduction through seasonality
             */
            const multiplierSeasonality = this.modificationSeasonality.getSeasonality();

            /**
             * reduction through quarantine
             */
            const multiplierQuarantine = this.getQuarantineMultiplier(indexContact) * this.getQuarantineMultiplier(indexParticipant);

            /**
             * contact value for this age group (category reductions get considered in ModificationContact)
             */
            const contactValue = this.modificationContact.getCellValue(indexContact, indexParticipant);

            this.cellValues[indexContact][indexParticipant] = contactValue * multiplierQuarantine * multiplierSeasonality;

        }

        return this.cellValues[indexContact][indexParticipant];

    }

    getMaxCellValue(): number {
        if (this.maxCellValue < 0) {
            this.maxCellValue = ContactCellsUtil.findMaxCellValue(this);
        }
        return this.maxCellValue;
    }

    getColumnValue(indexAgeGroup: number): number {
        if (this.columnValues[indexAgeGroup] < 0) {
            this.columnValues[indexAgeGroup] = ContactCellsUtil.findColumnValue(indexAgeGroup, this);
        }
        return this.columnValues[indexAgeGroup];
    }

    getMaxColumnValue(): number {
        if (this.maxColumnValue < 0) {
            this.maxColumnValue = ContactCellsUtil.findMaxColumnValue(this);
        }
        return this.maxColumnValue;
    }

    getColumnSum(): number {
        return this.getMatrixSum();
    }

    getMaxColumnSum(): number {
        return this.getMaxMatrixSum();
    }

    getCellSum(): number {
        return this.getMatrixSum();
    }

    getMatrixSum(): number {
        if (this.valueSum < 0) {
            this.valueSum = ContactCellsUtil.findMatrixValue(this);
        }
        return this.valueSum;
    }


    getMaxMatrixSum(): number {
        return this.getMatrixSum();
    }



}
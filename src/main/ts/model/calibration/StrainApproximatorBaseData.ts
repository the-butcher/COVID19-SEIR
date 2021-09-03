import { DataItem } from '@amcharts/amcharts4/core';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { Modifications } from '../../common/modification/Modifications';
import { ModificationStrain } from '../../common/modification/ModificationStrain';
import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { ObjectUtil } from '../../util/ObjectUtil';
import { TimeUtil } from '../../util/TimeUtil';
import { ModelConstants } from '../ModelConstants';
import { ModelImplRoot } from '../ModelImplRoot';
import { ModelInstants } from '../ModelInstants';
import { IDataItem, ModelStateIntegrator } from '../state/ModelStateIntegrator';
import { StrainUtil } from './../../util/StrainUtil';
import { IModelProgress } from './../state/ModelStateIntegrator';
import { BaseData, IBaseDataItemConfig } from '../basedata/BaseData';
import { IStrainApproximator } from './IStrainApproximator';
import { IBaseDataItem } from '../basedata/BaseDataItem';

/**
 * implementation of IStrainApproximator for the standard use case
 *
 * @author h.fleischer
 * @since 22.06.2021
 */
export class StrainApproximatorBaseData implements IStrainApproximator {

    private readonly instantDst: number;
    private readonly instantPre: number;

    private readonly demographics: Demographics;
    private readonly modifications: Modifications;
    private readonly baseData: BaseData;

    private readonly referenceDataRemoved: IBaseDataItem;

    constructor(demographics: Demographics, modifications: Modifications, baseData: BaseData) {

        this.demographics = demographics;
        this.modifications = modifications;
        this.baseData = baseData;

        this.instantDst = ModelInstants.getInstance().getMinInstant();
        this.instantPre = ModelInstants.getInstance().getPreInstant();

        this.referenceDataRemoved = this.baseData.findBaseDataItem(this.instantPre);

    }

    getReferenceDataRemoved(): IBaseDataItem {
        return this.referenceDataRemoved;
    }

    async approximate(progressCallback: (progress: IModelProgress) => void): Promise<void> {

        const ageGroups = this.demographics.getAgeGroups();

        /**
         * get all strain values as currently in modifications instance
         */
        const modificationsStrain = this.modifications.findModificationsByType('STRAIN').map(m => m as ModificationStrain);

        const modificationTime = ModelConstants.MODIFICATION_PARAMS['TIME'].createValuesModification({
            id: 'straintime',
            instant: this.instantPre,
            key: 'TIME',
            name: 'straintime',
            deletable: true,
            draggable: true,
            blendable: false
        }) as ModificationTime;
        modificationTime.setInstants(this.instantPre, this.instantPre);

        const modificationContact = this.modifications.findModificationsByType('CONTACT')[0] as ModificationContact;
        const modificationValueContact = modificationContact.getModificationValues();
        const modificationDiscovery = this.modifications.findModificationsByType('TESTING')[0] as ModificationDiscovery;
        const modificationValueDiscovery = modificationDiscovery.getModificationValues();

        modificationValueContact.instant = this.instantPre;
        modificationValueDiscovery.instant = this.instantPre;

        // fill with zeroes for each age group
        const heatmapPreIncidencesB = ageGroups.map(() => 0);
        const heatmapPreIncidencesC = ageGroups.map(() => 0);

        /**
         * once filled this value remains constant, it reflects the target incidence for each age group, but not respective shares of distinct strains, since not known at this point
         */
        const heatmapDstIncidencesB = ageGroups.map(() => 0);

        let heatmapPreIncidenceTotal = 0;
        let heatmapDstIncidenceTotal = 0;

        const minOffsetIndex = -2;
        const maxOffsetIndex = 3;

        /**
         * calculate target total incidence from existing data
         * incidence is calculated from one interval one week before model start date
         * reproduction is calculated from two intervals one week before and one week after model start date
         */
        const offsetIndexCount = maxOffsetIndex - minOffsetIndex;
        const casesToIncidence = (cases: number, population: number) => cases / offsetIndexCount * 100000 / population;
        for (let offsetIndex = minOffsetIndex; offsetIndex < maxOffsetIndex; offsetIndex++) {

            const instantPreA = this.instantPre + (offsetIndex - 7) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantPreB = this.instantPre + (offsetIndex) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantPreC = this.instantPre + (offsetIndex + 7) * TimeUtil.MILLISECONDS_PER____DAY;

            const instantDstA = this.instantDst + (offsetIndex - 7) * TimeUtil.MILLISECONDS_PER____DAY;
            const instantDstB = this.instantDst + offsetIndex * TimeUtil.MILLISECONDS_PER____DAY;

            const dataItemPreA = this.baseData.findBaseDataItem(instantPreA);
            const dataItemPreB = this.baseData.findBaseDataItem(instantPreB);
            const dataItemPreC = this.baseData.findBaseDataItem(instantPreC);

            const dataItemDstA = this.baseData.findBaseDataItem(instantDstA);
            const dataItemDstB = this.baseData.findBaseDataItem(instantDstB);

            ageGroups.forEach(ageGroup => {

                // cases at preload
                const casesPreA = dataItemPreA.getExposed(ageGroup.getName());
                const casesPreB = dataItemPreB.getExposed(ageGroup.getName());
                const casesPreC = dataItemPreC.getExposed(ageGroup.getName());

                // cases at model-min
                const casesDstA = dataItemDstA.getExposed(ageGroup.getName());
                const casesDstB = dataItemDstB.getExposed(ageGroup.getName());

                // case diffs (additional cases) at preload
                const heatmapCasesDeltaPreAB = casesPreB - casesPreA;
                const heatmapCasesDeltaPreBC = casesPreC - casesPreB;

                // case diff (additional cases) at model-min
                const heatmapCasesDeltaDstAB = casesDstB - casesDstA;

                // incidences at preload
                heatmapPreIncidencesB[ageGroup.getIndex()] += casesToIncidence(heatmapCasesDeltaPreAB, ageGroup.getAbsValue());
                heatmapPreIncidencesC[ageGroup.getIndex()] += casesToIncidence(heatmapCasesDeltaPreBC, ageGroup.getAbsValue());

                // incidence at model-min
                heatmapDstIncidencesB[ageGroup.getIndex()] += casesToIncidence(heatmapCasesDeltaDstAB, ageGroup.getAbsValue());

                if (ageGroup.getName() === '<= 04') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] += 2;
                }
                if (ageGroup.getName() === '05-14') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] += 4;
                }
                if (ageGroup.getName() === '15-24') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] += 0;
                }
                if (ageGroup.getName() === '25-34') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] -= 0;
                }
                if (ageGroup.getName() === '45-54') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] += 2;
                }
                if (ageGroup.getName() === '55-64') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] += 2;
                }
                if (ageGroup.getName() === '75-84') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] -= 2;
                }
                if (ageGroup.getName() === '>= 85') {
                    heatmapDstIncidencesB[ageGroup.getIndex()] += 8;
                }

            });

            // total incidence at preload
            const baseDataPreA = this.baseData.findBaseDataItem(instantPreA);
            const baseDataPreB = this.baseData.findBaseDataItem(instantPreB);
            const casesPreA = baseDataPreA.getExposed(ModelConstants.AGEGROUP_NAME_______ALL);
            const casesPreB = baseDataPreB.getExposed(ModelConstants.AGEGROUP_NAME_______ALL);
            const heatmapCasesDeltaPreAB = casesPreB - casesPreA;

            // total case diff at model-min
            const baseDataDstA = this.baseData.findBaseDataItem(instantDstA);
            const baseDataDstB = this.baseData.findBaseDataItem(instantDstB);
            const casesDstA = baseDataDstA.getExposed(ModelConstants.AGEGROUP_NAME_______ALL);
            const casesDstB = baseDataDstB.getExposed(ModelConstants.AGEGROUP_NAME_______ALL);
            const heatmapCasesDeltaDstAB = casesDstB - casesDstA;

            heatmapPreIncidenceTotal += casesToIncidence(heatmapCasesDeltaPreAB, this.demographics.getAbsTotal());
            heatmapDstIncidenceTotal += casesToIncidence(heatmapCasesDeltaDstAB, this.demographics.getAbsTotal());

        }
        // console.log(`pre incidence (ages age-groups, strains: ALL, date: ${TimeUtil.formatCategoryDate(this.instantPre)})`, heatmapPreIncidencesB, heatmapPreIncidenceTotal);
        // console.log(`dst incidence (ages age-groups, strains: ALL, date: ${TimeUtil.formatCategoryDate(this.instantDst)})`, heatmapDstIncidencesB, heatmapDstIncidenceTotal);

        let primaryStrainPreIncidence = heatmapPreIncidenceTotal;
        let primaryStrainDstIncidence = heatmapDstIncidenceTotal;

        // strains other than primary
        for (let strainIndexA = 1; strainIndexA < modificationsStrain.length; strainIndexA++) {

            const strainPreIncidence = modificationsStrain[strainIndexA].getModificationValues().dstIncidence / heatmapDstIncidenceTotal * heatmapPreIncidenceTotal;
            const strainDstIncidence = modificationsStrain[strainIndexA].getModificationValues().dstIncidence;

            primaryStrainPreIncidence -= strainPreIncidence;
            primaryStrainDstIncidence -= strainDstIncidence;

            // update primary strain to hold remaining incidence
            modificationsStrain[strainIndexA].acceptUpdate({
                preIncidence: strainPreIncidence,
                dstIncidence: strainDstIncidence
            });
            // console.log(`pre incidence (strain: ${modificationsStrain[strainIndexA].getName()}, date: ${TimeUtil.formatCategoryDate(this.instantPre)})`, modificationsStrain[strainIndexA].getIncidence());
            // console.log(`dst incidence (strain: ${modificationsStrain[strainIndexA].getName()}, date: ${TimeUtil.formatCategoryDate(this.instantDst)})`, modificationsStrain[strainIndexA].getIncidence());

        }

        // update primary strain to hold remaining incidence
        modificationsStrain[0].acceptUpdate({
            preIncidence: primaryStrainPreIncidence,
            dstIncidence: primaryStrainDstIncidence,
        });
        // console.log(`pre incidence (strain: ${modificationsStrain[0].getName()}, date: ${TimeUtil.formatCategoryDate(this.instantPre)})`, modificationsStrain[0].getIncidence());
        // console.log(`dst incidence (strain: ${modificationsStrain[0].getName()}, date: ${TimeUtil.formatCategoryDate(this.instantDst)})`, modificationsStrain[0].getIncidence());

        for (let strainIndexA = 0; strainIndexA < modificationsStrain.length; strainIndexA++) {

            const strainSharePreA = modificationsStrain[strainIndexA].getModificationValues().preIncidence / heatmapPreIncidenceTotal;

            // initial strain incidences as of incidence config
            const strainPreIncidences = heatmapPreIncidencesB.map(i => i * strainSharePreA);

            modificationsStrain[strainIndexA].acceptUpdate({
                preIncidences: strainPreIncidences,
            });

        }

        /**
         * approximate in multiple steps
         */
        let model: ModelImplRoot;
        let modelStateIntegrator: ModelStateIntegrator;

        for (let approximationIndex = 0; approximationIndex < ModelConstants.APPROXIMATION_________CYCLES; approximationIndex++) {

            const instantB = this.instantPre;
            const instantC = this.instantPre + TimeUtil.MILLISECONDS_PER___WEEK;
            for (let strainIndexA = 0; strainIndexA < modificationsStrain.length; strainIndexA++) {

                /**
                 * r0 = r0A * shareA + r0B * shareB + r0C * shareC
                 * r0 = r0A * shareA + (r0A / ratioOfReproductionAB) * shareB + (r0A / ratioOfReproductionAC) * shareC
                 * r0 = r0A * shareA + r0A * shareB / ratioOfReproductionAB + r0A * shareC / ratioOfReproductionAC
                 * r0 = r0A * (shareA + shareB / ratioOfReproductionAB + shareC / ratioOfReproductionAC
                 */
                let reproductionRatio = 0;
                for (let strainIndexB = 0; strainIndexB < modificationsStrain.length; strainIndexB++) {

                    const ratioAB = modificationsStrain[strainIndexA].getR0() / modificationsStrain[strainIndexB].getR0();
                    const strainShareB = modificationsStrain[strainIndexB].getModificationValues().preIncidence / heatmapPreIncidenceTotal;
                    reproductionRatio += strainShareB / ratioAB;
                    // console.log('ratio', modificationsStrain[strainIndexB].getName(), modificationsStrain[strainIndexA].getName(), ratioAB);

                }

                const strainReproductions: number[] = [];
                ageGroups.forEach(ageGroup => {
                    const strainReproduction = StrainUtil.calculateR0(heatmapPreIncidencesB[ageGroup.getIndex()], heatmapPreIncidencesC[ageGroup.getIndex()], instantB, instantC, modificationsStrain[strainIndexA].getSerialInterval() * modificationsStrain[strainIndexA].getIntervalScale());
                    strainReproductions.push(strainReproduction / reproductionRatio);
                });

                modificationsStrain[strainIndexA].acceptUpdate({
                    preGrowthRate: strainReproductions
                });

            }

            // build a model with current data
            model = new ModelImplRoot(this.demographics, this.modifications, this.referenceDataRemoved, this.baseData);
            modelStateIntegrator = new ModelStateIntegrator(model, this.instantPre);

            let modelData: IDataItem[];
            let dstInstant = -1;

            // modifications are sorted instant-wise
            // does strain calculation of preIncidences require consideration in other strains?
            // maybe yes, since the primary strains needs to adjust with other strain giving or requiring incidence
            const lastDataItems: IDataItem[] = [];
            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                // iterate if there is time between strains
                if (modificationsStrain[strainIndex].getInstantA() > dstInstant) {

                    dstInstant = modificationsStrain[strainIndex].getInstantA();
                    modelData = await modelStateIntegrator.buildModelData(dstInstant, curInstant => curInstant === dstInstant, modelProgress => {
                        progressCallback({
                            ratio: modelProgress.ratio
                        });
                    });

                    //get a data-item that contains the information at strain config instant
                    lastDataItems[strainIndex] = modelData[modelData.length - 1];

                }

            }
            // console.log('lastDataItems', lastDataItems, new Date(dstInstant));

            for (let strainIndex = 0; strainIndex < modificationsStrain.length; strainIndex++) {

                const lastDataItem = lastDataItems[strainIndex];

                // look at each age group separately
                const preIncidences: number[] = [...modificationsStrain[strainIndex].getModificationValues().preIncidences];

                // any strain other than primary should be able to "float" through age groups, so actually it should not constrain to strain specific values
                if (strainIndex > 0) {

                    // what it came to be in the model
                    const totalIncidenceSource = lastDataItem.valueset[ModelConstants.AGEGROUP_NAME_______ALL].INCIDENCES[modificationsStrain[strainIndex].getId()];

                    // what it should be at strain config time
                    const totalIncidenceTarget = modificationsStrain[strainIndex].getModificationValues().dstIncidence;

                    // a correction applicable to current incidence settings
                    const totalIncidenceFactor = totalIncidenceTarget / totalIncidenceSource;

                    ageGroups.forEach(ageGroup => {
                        preIncidences[ageGroup.getIndex()] *= totalIncidenceFactor;
                    });

                    modificationsStrain[strainIndex].acceptUpdate({
                        preIncidences,
                    });

                } else {

                    // primary strain!!
                    const otherIncidencesAtPrimaryStrainTime: number[] = ageGroups.map(() => 0); // by age group
                    for (let strainIndexB = 1; strainIndexB < modificationsStrain.length; strainIndexB++) {

                        // collect other strain's incidences for that time
                        ageGroups.forEach(ageGroup => {
                            otherIncidencesAtPrimaryStrainTime[ageGroup.getIndex()] += lastDataItem.valueset[ageGroup.getName()].INCIDENCES[modificationsStrain[strainIndexB].getId()];
                        });

                    }

                    ageGroups.forEach(ageGroup => {

                        // what it came to be in the model
                        const ageGroupIncidenceSource = lastDataItem.valueset[ageGroup.getName()].INCIDENCES[modificationsStrain[strainIndex].getId()];

                        // what it should be at strain config time
                        const ageGroupIncidenceTarget = heatmapDstIncidencesB[ageGroup.getIndex()] - otherIncidencesAtPrimaryStrainTime[ageGroup.getIndex()];

                        // a correction applicable to current incidence settings
                        const ageGroupIncidenceFactor = ageGroupIncidenceTarget / ageGroupIncidenceSource;

                        preIncidences[ageGroup.getIndex()] *= ageGroupIncidenceFactor;

                    });

                    modificationsStrain[strainIndex].acceptUpdate({
                        preIncidences,
                    });

                }

            }

        }

    }

}
import { ChartAgeGroupFlow } from './../chart/ChartAgeGroupFlow';
import { BaseData } from './../../model/basedata/BaseData';
import { TimeUtil } from './../../util/TimeUtil';
import { ModificationResolverContact } from './../../common/modification/ModificationResolverContact';
import { IconToggle } from './../gui/IconToggle';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { SliderContactCategory } from '../gui/SliderContactCategory';
import { SliderModification } from '../gui/SliderModification';
import { Demographics } from './../../common/demographics/Demographics';
import { Controls } from './Controls';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';

/**
 * controller for editing contact modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsContact {

    static getInstance(): ControlsContact {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsContact();
        }
        return this.instance;
    }
    private static instance: ControlsContact;

    private readonly chartContact: ChartContactMatrix;
    private readonly slidersCategory: SliderContactCategory[];
    private readonly iconBlendable: IconToggle;
    private readonly correctionTestContainer: HTMLDivElement;

    private modification: ModificationContact;



    constructor() {

        this.chartContact = new ChartContactMatrix('chartContactDiv', true);
        this.slidersCategory = [];

        this.iconBlendable = new IconToggle({
            container: 'slidersCategoryDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'smooth transition'
        });

        Demographics.getInstance().getCategories().forEach(contactCategory => {
            const slider = new SliderContactCategory(contactCategory);
            if (contactCategory.getName() === 'work') {
                slider.setDisabled(true);
            }
            this.slidersCategory.push(slider);
        });

        this.correctionTestContainer = document.createElement('div');
        this.correctionTestContainer.classList.add('toggle-outer');
        this.correctionTestContainer.innerHTML = 'estimate corrections';
        this.correctionTestContainer.style.cursor = 'pointer';
        document.getElementById('slidersCategoryDiv').appendChild(this.correctionTestContainer);
        this.correctionTestContainer.addEventListener('pointerup', e => {

            const nextModification = new ModificationResolverContact().getModifications().find(m => m.getInstant() > this.modification.getInstant());
            console.log('correction test', TimeUtil.formatCategoryDate(nextModification.getInstant()));

            const days = (nextModification.getInstant() - this.modification.getInstant()) / TimeUtil.MILLISECONDS_PER____DAY;
            console.log('days', days);

            const currBaseDataItem = BaseData.getInstance().findBaseDataItem(this.modification.getInstant());
            const currPlotDataItem = ChartAgeGroup.getInstance().findDataItemByCategory(TimeUtil.formatCategoryDate(this.modification.getInstant()));

            const nextBaseDataItem = BaseData.getInstance().findBaseDataItem(nextModification.getInstant());
            const nextPlotDataItem = ChartAgeGroup.getInstance().findDataItemByCategory(TimeUtil.formatCategoryDate(nextModification.getInstant()));

            const categoryCorrections: { [K in string] : number } = {};
            Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

                const currBaseDataCases = currBaseDataItem.getAverageCases(ageGroup.getIndex());
                const currPlotDataCases = currPlotDataItem.valueset[ageGroup.getName()].CASES;

                const nextBaseDataCases = nextBaseDataItem.getAverageCases(ageGroup.getIndex());
                const nextPlotDataCases = nextPlotDataItem.valueset[ageGroup.getName()].CASES;

                // actual delta in base cases
                const deltaBaseCases = nextBaseDataCases - currBaseDataCases;

                // what the current settings in model did
                const deltaCurrCases = nextPlotDataCases - currPlotDataCases;

                // current correction setting
                const modificationCorrection = this.modification.getCorrectionValue('other', ageGroup.getIndex());

                // const correctionRatio = deltaBaseCases / deltaCurrCases;

                const correctionRatio = nextBaseDataItem.getAverageCases(ageGroup.getIndex()) / nextPlotDataItem.valueset[ageGroup.getName()].CASES;
                // console.log(nextBaseDataCases, currBaseDataCases, deltaBaseCases, deltaCurrCases, '=>', correctionRatio);

                categoryCorrections[ageGroup.getName()] = modificationCorrection * correctionRatio;

            });
            // categoryCorrections['05-14'] = 1;
            // categoryCorrections['>= 85'] = 1;

            console.log('categoryCorrections', categoryCorrections);
            this.handleCorrections(categoryCorrections);

        });

    }

    handleCorrections(categoryCorrections: { [K in string] : number }): void {

        const corrections: { [K in string] : { [K in string] : number } } = {};
        this.slidersCategory.forEach(sliderCategory => {
            corrections[sliderCategory.getName()] = categoryCorrections;
        });

        this.modification.acceptUpdate({
            corrections
        });
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    handleChange(): void {

        // apply current slider settings to the slider-category filter on the modification
        const multipliers: { [K in string] : number } = {};

        this.slidersCategory.forEach(sliderCategory => {
            multipliers[sliderCategory.getName()] = sliderCategory.getValue();
        });

        const blendable = this.iconBlendable.getState();
        this.modification.acceptUpdate({
            multipliers,
            blendable
        });
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    applyToChartContact(): void {
        this.chartContact.acceptContactMatrix(this.modification);
    }

    acceptModification(modification: ModificationContact): void {

        // console.warn('acceptModification', modification);

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersCategory.forEach(sliderCategory => {
            sliderCategory.setValue(modification.getCategoryValue(sliderCategory.getName()));
            sliderCategory.acceptModification(this.modification);
        });
        this.iconBlendable.toggle(modification.isBlendable());

        requestAnimationFrame(() => {
            this.applyToChartContact();
            this.slidersCategory.forEach(sliderCategory => {
                sliderCategory.handleResize();
            });
        });

    }


}
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { SliderContactCategory } from '../gui/SliderContactCategory';
import { SliderModification } from '../gui/SliderModification';
import { Demographics } from './../../common/demographics/Demographics';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { IconToggle } from './../gui/IconToggle';
import { Controls } from './Controls';

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
    private readonly iconMultipliers: IconToggle;
    private readonly iconCorrections: IconToggle;

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
        this.iconMultipliers = new IconToggle({
            container: 'slidersCategoryDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'allow category adaption'
        });
        this.iconCorrections = new IconToggle({
            container: 'slidersCategoryDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'allow age-group adaption'
        });

        Demographics.getInstance().getCategories().forEach(contactCategory => {
            const slider = new SliderContactCategory(contactCategory);
            if (contactCategory.getName() === 'work') {
                slider.setDisabled(true);
            }
            this.slidersCategory.push(slider);
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
        const adaptMultipliers = this.iconMultipliers.getState();
        const adaptCorrections = this.iconCorrections.getState();
        this.modification.acceptUpdate({
            multipliers,
            blendable,
            adaptMultipliers,
            adaptCorrections
        });
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    applyToChartContact(): void {
        this.chartContact.acceptContactMatrix(this.modification);
    }

    acceptModification(modification: ModificationContact): void {

        // console.warn('acceptModification', modification, modification.isBlendable());

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersCategory.forEach(sliderCategory => {
            sliderCategory.setValue(modification.getCategoryValue(sliderCategory.getName()));
            sliderCategory.acceptModification(this.modification);
        });
        this.iconBlendable.toggle(modification.isBlendable());
        this.iconMultipliers.toggle(modification.isAdaptMultipliers());
        this.iconCorrections.toggle(modification.isAdaptCorrections());

        requestAnimationFrame(() => {
            this.applyToChartContact();
            this.slidersCategory.forEach(sliderCategory => {
                sliderCategory.handleResize();
            });
        });

    }

    getModification(): ModificationContact {
        return this.modification;
    }


}
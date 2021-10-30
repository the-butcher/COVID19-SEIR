import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderContactCategory } from '../gui/SliderContactCategory';
import { SliderModification } from '../gui/SliderModification';
import { StorageUtil } from '../storage/StorageUtil';
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
    private readonly iconReadonly: IconToggle;

    private modification: ModificationContact;


    constructor() {

        this.chartContact = new ChartContactMatrix('chartContactDiv', true);
        this.slidersCategory = [];

        this.iconReadonly = new IconToggle({
            container: 'slidersCategoryDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'readonly'
        });

        Demographics.getInstance().getCategories().forEach(contactCategory => {
            this.slidersCategory.push(new SliderContactCategory(contactCategory));
        });

        this.setSliderStates();

    }


    setSliderStates(): void {

        this.slidersCategory.forEach(sliderCategory => {
            if (this.modification?.isReadonly() || sliderCategory.getName() === 'work' || sliderCategory.getName() === 'family') {
                sliderCategory.setDisabled(true);
            } else {
                sliderCategory.setDisabled(false);
            }
        });

    }

    handleCorrections(categoryCorrections: { [K in string] : number }): void {

        this.modification.acceptUpdate({
            corrections: {...categoryCorrections}
        });
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    handleChange(): void {

        // apply current slider settings to the slider-category filter on the modification
        const multipliers: { [K in string] : number } = {};

        this.slidersCategory.forEach(sliderCategory => {
            multipliers[sliderCategory.getName()] = sliderCategory.getValue();
        });

        const readonly = this.iconReadonly.getState();
        this.modification.acceptUpdate({
            multipliers,
            readonly
        });

        this.setSliderStates();
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    applyToChartContact(): void {
        this.chartContact.acceptContactMatrix(this.modification);
    }

    acceptModification(modification: ModificationContact): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersCategory.forEach(sliderCategory => {
            sliderCategory.setValue(modification.getCategoryValue(sliderCategory.getName()));
            sliderCategory.acceptModification(this.modification);
        });
        this.iconReadonly.toggle(modification.isReadonly());
        this.setSliderStates();

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
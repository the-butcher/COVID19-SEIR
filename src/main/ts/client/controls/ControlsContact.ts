import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderContactCategory } from '../gui/SliderContactCategory';
import { SliderModification } from '../gui/SliderModification';
import { StorageUtil } from '../storage/StorageUtil';
import { Demographics } from './../../common/demographics/Demographics';
import { ModificationContact } from './../../common/modification/ModificationContact';
import { IconToggle } from './../gui/IconToggle';
import { ModelActions } from './../gui/ModelActions';
import { Controls } from './Controls';
import { ControlsRegression } from './ControlsRegression';

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
    private readonly sliderCategory: SliderContactCategory;
    private readonly iconReadonly: IconToggle;

    private modification: ModificationContact;


    constructor() {

        this.chartContact = new ChartContactMatrix('chartContactDiv', true);

        this.iconReadonly = new IconToggle({
            container: 'slidersCategoryDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'readonly'
        });

        // find first category
        const defaultCategory = Demographics.getInstance().getCategories().find(c => true);
        this.sliderCategory = new SliderContactCategory(defaultCategory);

        this.setSliderState();

    }

    handleCategoryChange(): void {
        if (this.modification) {
            const category = Demographics.getInstance().getCategories().find(c => c.getName() === ModelActions.getInstance().getCategory());
            this.sliderCategory.setCategory(category);
            this.sliderCategory.setValue(this.modification.getCategoryValue(this.sliderCategory.getName()));
            this.setSliderState();
        }
    }

    setSliderState(): void {

        // if (this.modification?.isReadonly() || this.sliderCategory.getName() === 'work' || this.sliderCategory.getName() === 'family') {
        //     this.sliderCategory.setDisabled(true);
        // } else {
        //     this.sliderCategory.setDisabled(false);
        // }

    }

    handleCorrections(corrections: { [K in string]: number }): void {

        this.modification.acceptUpdate({
            corrections: { ...corrections }
        });
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();

        /**
         * give the chart a chance for pre model chart update, i.e. to show an updated regression curve
         */
        ChartAgeGroup.getInstance().handleModificationChange();

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    handleChange(): void {

        // apply current slider settings to the slider-category filter on the modification
        const multipliers: { [K in string]: number } = {};

        multipliers[this.sliderCategory.getName()] = this.sliderCategory.getValue();

        const readonly = this.iconReadonly.getState();
        this.modification.acceptUpdate({
            multipliers,
            readonly
        });

        this.setSliderState();
        // console.log('handleChange', corrections, this.modification);

        this.applyToChartContact();

        /**
         * give the chart a chance for pre model chart update, i.e. to show an updated regression curve
         */
        ChartAgeGroup.getInstance().handleModificationChange();

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

        this.sliderCategory.setValue(modification.getCategoryValue(this.sliderCategory.getName()));
        this.sliderCategory.acceptModification(this.modification);

        this.iconReadonly.toggle(modification.isReadonly());
        this.setSliderState();

        requestAnimationFrame(() => {
            this.applyToChartContact();
            this.sliderCategory.handleResize();
        });

    }

    getModification(): ModificationContact {
        return this.modification;
    }


}
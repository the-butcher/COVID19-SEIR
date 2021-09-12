import { IconToggle } from './../gui/IconToggle';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { SliderContactCategory } from '../gui/SliderContactCategory';
import { SliderModification } from '../gui/SliderModification';
import { Demographics } from './../../common/demographics/Demographics';
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
            this.slidersCategory.push(new SliderContactCategory(contactCategory));
        });

    }

    handleChange(): void {

        // apply current slider settings to the slider-category filter on the modification
        const multipliers: { [K in string] : number } = {};
        const corrections: { [K in string] : { [K in string] : number } } = {};
        this.slidersCategory.forEach(sliderCategory => {
            multipliers[sliderCategory.getName()] = sliderCategory.getValue();
            const categoryCorrections = sliderCategory.getCorrections();
            if (categoryCorrections) {
                corrections[sliderCategory.getName()] = categoryCorrections;
            }
        });
        const blendable = this.iconBlendable.getState();
        this.modification.acceptUpdate({
            multipliers,
            corrections,
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
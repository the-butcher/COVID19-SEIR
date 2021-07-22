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
    private slidersCategory: SliderContactCategory[];

    private modification: ModificationContact;

    constructor() {

        this.chartContact = new ChartContactMatrix('chartContactDiv', true);
        this.slidersCategory = [];

        Demographics.getInstance().getContactCategories().forEach(contactCategory => {
            this.slidersCategory.push(new SliderContactCategory(contactCategory));
        });

    }

    handleChange(): void {

        // apply current slider settings to the slider-category filter on the modification
        const multipliers: { [K in string] : number } = {};
        this.slidersCategory.forEach(sliderCategory => {
            multipliers[sliderCategory.getName()] = sliderCategory.getValue();
        });
        this.modification.acceptUpdate({
            multipliers
        });

        this.applyToChartContact();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    applyToChartContact(): void {
        const demographics = Demographics.getInstance();
        this.chartContact.acceptContactCells(this.modification.getInstant(), this.modification, demographics.getMaxCellValue(), demographics.getMaxColumnValue());
    }

    acceptModification(modification: ModificationContact): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersCategory.forEach(sliderCategory => {
            sliderCategory.setValue(modification.getMultiplier(sliderCategory.getName()));
        });

        requestAnimationFrame(() => {
            this.applyToChartContact();
            this.slidersCategory.forEach(sliderCategory => {
                sliderCategory.handleResize();
            });
        });

    }


}
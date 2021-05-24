import { Demographics } from '../../common/demographics/Demographics';
import { Modifications } from '../../common/modification/Modifications';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup, IModificationData } from '../chart/ChartAgeGroup';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ChartUtil } from '../chart/ChartUtil';
import { SliderContactCategory } from '../gui/SliderContactCategory';
import { SliderModification } from '../gui/SliderModification';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ControlsConstants } from './../gui/ControlsConstants';
import { Controls } from './Controls';
import { TimeUtil } from '../../util/TimeUtil';

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

        this.chartContact = new ChartContactMatrix('chartContactDiv');
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

        ControlsConstants.rebuildModificationData('CONTACT', 1);
        this.chartContact.redraw(this.modification);
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationContact): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersCategory.forEach(sliderCategory => {
            sliderCategory.setValue(modification.getMultiplier(sliderCategory.getName()));
        });

        this.chartContact.redraw(modification);

    }


}
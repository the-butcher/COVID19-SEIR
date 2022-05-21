import { Demographics } from '../../common/demographics/Demographics';
import { ModificationSeasonality } from '../../common/modification/ModificationSeasonality';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ControlsConstants } from '../gui/ControlsConstants';
import { SliderModification } from '../gui/SliderModification';
import { SliderSeasonality } from '../gui/SliderSeasonality';
import { StorageUtil } from '../storage/StorageUtil';
import { Controls } from './Controls';

/**
 * controller for editing seasonality modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsSeasonality {

    static getInstance(): ControlsSeasonality {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsSeasonality();
        }
        return this.instance;
    }
    private static instance: ControlsSeasonality;

    // private sliderAmount: SliderSeasonality;
    private modification: ModificationSeasonality;

    private readonly slidersSeasonality: SliderSeasonality[];

    constructor() {

        // this.sliderAmount = new SliderSeasonality('global');

        this.slidersSeasonality = [];
        Demographics.getInstance().getCategories().forEach(contactCategory => {
            this.slidersSeasonality.push(new SliderSeasonality(contactCategory.getName()));
        });

    }

    handleChange(): void {

        const seasonalities: { [K in string]: number } = {};
        let updatedCategories: string[] = [];
        this.slidersSeasonality.forEach(sliderSeasonality => {
            if (sliderSeasonality.getValue() !== this.modification.getCategoryValue(sliderSeasonality.getName())) {
                updatedCategories.push(sliderSeasonality.getName());
            }
            seasonalities[sliderSeasonality.getName()] = sliderSeasonality.getValue();
        });

        this.modification.acceptUpdate({
            // seasonality: this.sliderAmount.getValue(),
            seasonalities
        });

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update

    }

    acceptModification(modification: ModificationSeasonality): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        // this.sliderAmount.setValue(this.modification.getSeasonality());
        this.slidersSeasonality.forEach(sliderSeasonality => {
            sliderSeasonality.setValue(modification.getCategoryValue(sliderSeasonality.getName()));
        });

        requestAnimationFrame(() => {
            this.slidersSeasonality.forEach(sliderSeasonality => {
                sliderSeasonality.handleResize();
            });
            // this.sliderAmount.handleResize();
        });

    }

}
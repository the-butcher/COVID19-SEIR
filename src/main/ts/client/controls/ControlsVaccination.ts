import { Demographics } from '../../common/demographics/Demographics';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { ObjectUtil } from '../../util/ObjectUtil';
import { SliderModification } from '../gui/SliderModification';
import { SliderVaccination } from '../gui/SliderVaccination';
import { Controls } from './Controls';

/**
 * controller for editing vaccination modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsVaccination {

    static getInstance(): ControlsVaccination {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsVaccination();
        }
        return this.instance;
    }
    private static instance: ControlsVaccination;

    private sliderDosesPerDay: SliderVaccination;

    private modification: ModificationVaccination;

    constructor() {
        const absTotal = Demographics.getInstance().getAbsTotal();
        const dosesPerDayMax = ObjectUtil.getMaxVaccinations(absTotal);
        this.sliderDosesPerDay = new SliderVaccination(dosesPerDayMax);
    }

    handleChange(): void {
        this.modification.acceptUpdate({
            doses: this.sliderDosesPerDay.getValue()
        });
        SliderModification.getInstance().indicateUpdate(this.modification.getId());
    }

    acceptModification(modification: ModificationVaccination): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.sliderDosesPerDay.setValue(this.modification.getDosesPerDay());

        requestAnimationFrame(() => {
            this.sliderDosesPerDay.handleResize();
        });

    }

}
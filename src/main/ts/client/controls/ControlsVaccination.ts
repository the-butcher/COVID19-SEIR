import { Demographics } from '../../common/demographics/Demographics';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { ObjectUtil } from '../../util/ObjectUtil';
import { SliderModification } from '../gui/SliderModification';
import { SliderVaccination } from '../gui/SliderVaccination';
import { ControlsConstants } from './../gui/ControlsConstants';
import { Controls } from './Controls';

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
        const exp = Math.round(Math.log10(absTotal)) - 2;
        const dosesPerDayMax = Math.pow(10, exp);
        this.sliderDosesPerDay = new SliderVaccination(dosesPerDayMax);
    }

    handleChange(): void {
        this.modification.acceptUpdate({
            doses: this.sliderDosesPerDay.getValue()
        });
        ControlsConstants.rebuildModificationData('VACCINATION', 100000);
        SliderModification.getInstance().indicateUpdate(this.modification.getId());
    }

    acceptModification(modification: ModificationVaccination): void {
        Controls.acceptModification(modification);
        this.modification = modification;
        this.sliderDosesPerDay.setValue(this.modification.getDosesPerDay());
    }

}
import { Modifications } from '../../common/modification/Modifications';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup, IModificationData } from '../chart/ChartAgeGroup';
import { ChartUtil } from '../chart/ChartUtil';
import { Demographics } from '../../common/demographics/Demographics';
import { SliderModification } from '../gui/SliderModification';
import { SliderVaccination } from '../gui/SliderVaccination';
import { ModelConstants } from '../../model/ModelConstants';
import { Controls } from './Controls';
import { ControlsConstants } from '../gui/ControlsConstants';
import { TimeUtil } from '../../util/TimeUtil';

export class ControlsVaccination {

    static getInstance(): ControlsVaccination {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsVaccination();
        }
        return this.instance;
    }
    private static instance: ControlsVaccination;

    static rebuildModificationData(): void {
        const modificationData: IModificationData[] = [];
        Modifications.getInstance().findModificationsByType('VACCINATION').forEach(modification => {
            modificationData.push({
                modValueY: modification.getModificationValue(),
                categoryX: TimeUtil.formatCategoryDate(modification.getInstantA())
            });
            modificationData.push({
                modValueY: modification.getModificationValue(),
                categoryX: TimeUtil.formatCategoryDate(modification.getInstantB())
            });
        });
        ChartAgeGroup.getInstance().showModifications({
            min: 0,
            max: 100000,
            percent: true,
            text: 'VACCINATION',
            color: ControlsConstants.COLORS['VACCINATION'],
            useObjectColors: true,
        }, modificationData);
    }

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
        ControlsVaccination.rebuildModificationData();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());
    }

    acceptModification(modification: ModificationVaccination): void {
        Controls.acceptModification(modification);
        this.modification = modification;
        this.sliderDosesPerDay.setValue(this.modification.getDosesPerDay());
    }

}
import { SliderModification } from './../gui/SliderModification';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ControlsConstants } from '../gui/ControlsConstants';
import { ContactMatrixEffective } from './ContactMatrixEffective';
import { Controls } from './Controls';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';

/**
 * controller for editing time modifications (which does not actually change anything, but rather displays state)
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsTime {

    static getInstance(): ControlsTime {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsTime();
        }
        return this.instance;
    }
    private static instance: ControlsTime;

    private readonly chartTime: ChartContactMatrix;
    private modification: ModificationTime;

    constructor() {
        this.chartTime = new ChartContactMatrix('chartTimeDiv');
    }

    handleChange(): void {
        // this is usually called when a control (a slider) updates a modification
    }

    /**
     *
     * @param modification R\_0
     */
    acceptModification(modification: ModificationTime): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.chartTime.redraw(new ContactMatrixEffective(this.modification));

        document.getElementById('infoVaccinationSpan').innerHTML = this.modification.getDosesPerDay().toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED);

    }

}
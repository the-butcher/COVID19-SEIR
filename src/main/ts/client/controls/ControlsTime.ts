import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { Controls } from './Controls';
import { ModificationTime } from '../../common/modification/ModificationTime';

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

        // console.warn('handleChange');
        // no-op, no changeable state in ControlsTime
        // TODO this should NOT update the model
    }

    /**
     *
     * @param modification R\_0
     */
    acceptModification(modification: ModificationTime): void {

        Controls.acceptModification(modification);
        this.modification = modification;
        this.chartTime.redraw(modification);

        document.getElementById('infoVaccinationSpan').innerHTML = this.modification.getDosesPerDay().toLocaleString(undefined, ModelConstants.LOCALE_FORMAT_FIXED);

        // TODO decide how the strain diagram can be presented
        //      NO another part of the time diagram (but then strain might not be pickable)
        //      -- have one section for each "possible" strain in the model in their order of appearance (these can be grayed out per position of time slider)
        //      -- at full contact matrix one average person infects R₀ other people

        // TODO for the given time
        console.warn('TODO :: display effective settings (switchable ChartTime + cross section plot)');

    }

}
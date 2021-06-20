import { ModificationTime } from '../../common/modification/ModificationTime';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ModificationResolverTime } from './../../common/modification/ModificationResolverTime';
import { Controls } from './Controls';

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

    private readonly chartContactMatrix: ChartContactMatrix;

    constructor() {
        this.chartContactMatrix = new ChartContactMatrix('chartTimeDiv', false);
    }

    getChartContactMatrix(): ChartContactMatrix {
        return this.chartContactMatrix;
    }

    handleChange(): void {
        // this is usually called when a control (a slider) updates a modification
    }

    acceptModification(modification: ModificationTime): void {

        Controls.acceptModification(modification);
        const contactMatrix = ModificationResolverTime.getInstance().findContactMatrix(modification.getInstantA());

        requestAnimationFrame(() => {
            this.chartContactMatrix.redraw(contactMatrix);
        });

    }

}
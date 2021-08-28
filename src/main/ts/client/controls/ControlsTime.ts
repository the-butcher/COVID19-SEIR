import { ModificationTime } from '../../common/modification/ModificationTime';
import { BaseData } from '../../model/basedata/BaseData';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { ChartDiscovery } from '../chart/ChartDiscovery';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
import { ControlsConstants } from '../gui/ControlsConstants';
import { Demographics } from './../../common/demographics/Demographics';
import { ModificationResolverTime } from './../../common/modification/ModificationResolverTime';
import { ModelConstants } from './../../model/ModelConstants';
import { ObjectUtil } from './../../util/ObjectUtil';
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
    private readonly chartDiffIncidences: ChartDiscovery;

    constructor() {
        this.chartContactMatrix = new ChartContactMatrix('chartTimeDiv', false);
        this.chartDiffIncidences = new ChartDiscovery('chartDiffIncidenceDiv', -20, 20, ControlsConstants.LABEL_ABSOLUTE_FLOAT_2, ControlsConstants.LABEL_ABSOLUTE_FLOAT_2);
    }

    getChartContactMatrix(): ChartContactMatrix {
        return this.chartContactMatrix;
    }

    handleChange(): void {
        // this is usually called when a control (a slider) updates a modification
    }

    acceptModification(modification: ModificationTime): void {

        // console.log('time update');

        Controls.acceptModification(modification);
        const modificationResolver = ModificationResolverTime.getInstance();
        const contactMatrix = modificationResolver.findContactMatrix(modification.getInstantA());

        // const ageGroups = Demographics.getInstance().getAgeGroups();
        // const dataItem = ChartAgeGroup.getInstance().findDataItemByInstant(modification.getInstant());
        // const baseIncidences = BaseData.getInstance().findIncidences(modification.getInstant(), ageGroups);
        // if (ObjectUtil.isNotEmpty(baseIncidences)) {

        //     // build a difference for each age group
        //     const diffIncidences = ageGroups.map(g => dataItem.valueset[g.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL] - baseIncidences[g.getIndex()]);
        //     const columnSum = diffIncidences.reduce((prev, curr) => prev + curr, 0);
        //     const maxColumnSum = ageGroups.length * 10;

        //     // this.chartDiffIncidences.acceptContactColumns({
        //     //     getColumnValue: i => diffIncidences[i],
        //     //     getMaxColumnValue: () => 0,
        //     //     getColumnSum: () => columnSum,
        //     //     getMaxColumnSum: () => maxColumnSum,
        //     // });
        //     // console.log('diffIncidences', diffIncidences);
        // };

        requestAnimationFrame(() => {
            this.chartContactMatrix.acceptContactMatrix(contactMatrix);
        });

    }

}
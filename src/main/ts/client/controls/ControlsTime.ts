import { ModificationTime } from '../../common/modification/ModificationTime';
import { BaseData } from '../../model/calibration/BaseData';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { ChartContactColumns } from '../chart/ChartContactColumns';
import { ChartContactMatrix } from '../chart/ChartContactMatrix';
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
    private readonly chartDiffIncidences: ChartContactColumns;

    constructor() {
        this.chartContactMatrix = new ChartContactMatrix('chartTimeDiv', false);
        this.chartDiffIncidences = new ChartContactColumns('chartDiffIncidenceDiv', -20, 20);
    }

    getChartContactMatrix(): ChartContactMatrix {
        return this.chartContactMatrix;
    }

    handleChange(): void {
        // this is usually called when a control (a slider) updates a modification
    }

    acceptModification(modification: ModificationTime): void {

        console.log('time update');

        Controls.acceptModification(modification);
        const modificationResolver = ModificationResolverTime.getInstance();
        const contactCells = modificationResolver.findContactCells(modification.getInstantA());
        const maxCellValue = modificationResolver.getMaxCellValue();
        const maxColumnValue = modificationResolver.getMaxColumnValue();


        const ageGroups = Demographics.getInstance().getAgeGroups();
        const dataItem = ChartAgeGroup.getInstance().findDataItemByInstant(modification.getInstant());
        const baseIncidences = BaseData.getInstance().findIncidences(modification.getInstant(), ageGroups);
        if (ObjectUtil.isNotEmpty(baseIncidences)) {
            const diffIncidences = ageGroups.map(g => dataItem.valueset[g.getName()].INCIDENCES[ModelConstants.STRAIN_ID___________ALL] - baseIncidences[g.getIndex()]);
            this.chartDiffIncidences.acceptContactColumns({
                getColumnValue: i => diffIncidences[i],
                getValueSum: () => 0
            })
            console.log('diffIncidences', diffIncidences);
        };

        requestAnimationFrame(() => {
            this.chartContactMatrix.acceptContactCells(modification.getInstant(), contactCells, maxCellValue, maxColumnValue);
        });

    }

}
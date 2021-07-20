import { Demographics } from '../../common/demographics/Demographics';
import { ModificationTesting } from '../../common/modification/ModificationTesting';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactColumns } from '../chart/ChartContactColumns';
import { SliderModification } from '../gui/SliderModification';
import { SliderTestingCategory } from '../gui/SliderTestingCategory';
import { Controls } from './Controls';

/**
 * controller for editing testing modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsTesting {

    static getInstance(): ControlsTesting {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsTesting();
        }
        return this.instance;
    }
    private static instance: ControlsTesting;

    private readonly chartTesting: ChartContactColumns;
    private readonly slidersTesting: SliderTestingCategory[];

    private modification: ModificationTesting;

    constructor() {

        this.chartTesting = new ChartContactColumns('chartTestingDiv');
        this.slidersTesting = [];

        Demographics.getInstance().getContactCategories().forEach(contactCategory => {
            this.slidersTesting.push(new SliderTestingCategory(contactCategory.getName()));
        });

    }

    handleChange(): void {

        const multipliers: { [K in string] : number } = {};
        this.slidersTesting.forEach(sliderTesting => {
            multipliers[sliderTesting.getName()] = sliderTesting.getValue();
        });
        this.modification.acceptUpdate({
            multipliers
        });
        this.chartTesting.redraw(this.modification);
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationTesting): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersTesting.forEach(sliderTesting => {
            sliderTesting.setValue(modification.getMultiplier(sliderTesting.getName()));
        });

        requestAnimationFrame(() => {
            this.chartTesting.redraw(modification);
            this.slidersTesting.forEach(sliderTesting => {
                sliderTesting.handleResize();
            });
        });

    }

}
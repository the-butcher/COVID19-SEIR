import { ChartTesting } from '../chart/ChartTesting';
import { ObjectUtil } from '../../util/ObjectUtil';
import { Controls } from './Controls';
import { Demographics } from '../../common/demographics/Demographics';
import { SliderTestingCategory } from '../gui/SliderTestingCategory';
import { SliderModification } from '../gui/SliderModification';
import { ModificationTesting } from '../../common/modification/ModificationTesting';
import { ChartAgeGroup, IModificationData } from '../chart/ChartAgeGroup';
import { Modifications } from '../../common/modification/Modifications';
import { TimeUtil } from '../../util/TimeUtil';
import { ControlsConstants } from '../gui/ControlsConstants';

export class ControlsTesting {

    static getInstance(): ControlsTesting {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsTesting();
        }
        return this.instance;
    }
    private static instance: ControlsTesting;

    private readonly chartTesting: ChartTesting;
    private readonly slidersTesting: SliderTestingCategory[];

    private modification: ModificationTesting;

    constructor() {

        this.chartTesting = new ChartTesting('chartTestingDiv');
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

        this.chartTesting.redraw(modification);

    }

}
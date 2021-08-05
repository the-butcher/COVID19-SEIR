import { ControlsConstants } from './../gui/ControlsConstants';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationTesting } from '../../common/modification/ModificationTesting';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartContactColumns } from '../chart/ChartContactColumns';
import { IconToggle } from '../gui/IconToggle';
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
    private readonly iconBlendable: IconToggle;

    private modification: ModificationTesting;

    constructor() {

        this.chartTesting = new ChartContactColumns('chartTestingDiv', 0.00, 1.01, ControlsConstants.LABEL_PERCENT___FIXED, ControlsConstants.LABEL_PERCENT__FLOAT_2);
        this.slidersTesting = [];

        this.iconBlendable = new IconToggle({
            container: 'slidersTestingDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'smooth transition'
        });

        Demographics.getInstance().getContactCategories().forEach(contactCategory => {
            this.slidersTesting.push(new SliderTestingCategory(contactCategory.getName()));
        });

    }

    handleChange(): void {

        const multipliers: { [K in string] : number } = {};
        this.slidersTesting.forEach(sliderTesting => {
            multipliers[sliderTesting.getName()] = sliderTesting.getValue();
        });
        const blendable = this.iconBlendable.getState();
        this.modification.acceptUpdate({
            multipliers,
            blendable
        });
        this.chartTesting.acceptContactColumns(this.modification);
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationTesting): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersTesting.forEach(sliderTesting => {
            sliderTesting.setValue(modification.getMultiplier(sliderTesting.getName()));
        });
        this.iconBlendable.toggle(modification.isBlendable());

        requestAnimationFrame(() => {
            this.chartTesting.acceptContactColumns(modification);
            this.slidersTesting.forEach(sliderTesting => {
                sliderTesting.handleResize();
            });
        });

    }

}
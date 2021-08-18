import { ControlsConstants } from '../gui/ControlsConstants';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartDiscovery } from '../chart/ChartDiscovery';
import { IconToggle } from '../gui/IconToggle';
import { SliderModification } from '../gui/SliderModification';
import { SliderTestingCategory } from '../gui/SliderTestingCategory';
import { Controls } from './Controls';
import { ModificationTime } from '../../common/modification/ModificationTime';

/**
 * controller for editing testing modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsDiscovery {

    static getInstance(): ControlsDiscovery {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsDiscovery();
        }
        return this.instance;
    }
    private static instance: ControlsDiscovery;

    private readonly chartTesting: ChartDiscovery;
    private readonly slidersTesting: SliderTestingCategory[];
    private readonly iconBlendable: IconToggle;

    private modification: ModificationDiscovery;

    constructor() {

        this.chartTesting = new ChartDiscovery('chartTestingDiv', 0.00, 1.01, ControlsConstants.LABEL_PERCENT___FIXED, ControlsConstants.LABEL_PERCENT__FLOAT_2);
        this.slidersTesting = [];

        this.iconBlendable = new IconToggle({
            container: 'slidersTestingDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'smooth transition'
        });

        Demographics.getInstance().getCategories().forEach(contactCategory => {
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
        this.updateChart(this.modification.getInstantA());
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationDiscovery): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.slidersTesting.forEach(sliderTesting => {
            sliderTesting.setValue(modification.getCategoryValue(sliderTesting.getName()));
        });
        this.iconBlendable.toggle(modification.isBlendable());

        this.updateChart(modification.getInstantA());

    }

    updateChart(instant: number): void {

        const modificationTime = new ModificationTime({
            id: ObjectUtil.createId(),
            key: 'TIME',
            instant,
            name: 'step',
            deletable: false,
            draggable: false,
            blendable: false
        });
        modificationTime.setInstants(instant, instant);

        requestAnimationFrame(() => {
            this.chartTesting.acceptModificationTime(modificationTime);
            this.slidersTesting.forEach(sliderTesting => {
                sliderTesting.handleResize();
            });
        });
    }

}
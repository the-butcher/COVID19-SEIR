import { TimeUtil } from './../../util/TimeUtil';
import { timingSafeEqual } from 'crypto';
import { ModificationDiscovery } from '../../common/modification/ModificationDiscovery';
import { ModificationTime } from '../../common/modification/ModificationTime';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartDiscovery } from '../chart/ChartDiscovery';
import { ControlsConstants } from '../gui/ControlsConstants';
import { IconToggle } from '../gui/IconToggle';
import { SliderDiscoveryCategory } from '../gui/SliderDiscoveryCategory';
import { Demographics } from './../../common/demographics/Demographics';
import { Controls } from './Controls';
import { SliderModification } from '../gui/SliderModification';

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
    private readonly sliderOverall: SliderDiscoveryCategory;
    private readonly slidersDiscovery: SliderDiscoveryCategory[];
    private readonly iconBlendable: IconToggle;
    private readonly iconBoundToTotal: IconToggle;

    private modification: ModificationDiscovery;

    constructor() {

        this.chartTesting = new ChartDiscovery('chartTestingDiv', 0.00, 1.01, ControlsConstants.LABEL_PERCENT___FIXED, ControlsConstants.LABEL_PERCENT__FLOAT_2);
        this.slidersDiscovery = [];

        this.iconBlendable = new IconToggle({
            container: 'slidersTestingDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'smooth transition'
        });

        this.sliderOverall = new SliderDiscoveryCategory('total');

        this.iconBoundToTotal = new IconToggle({
            container: 'slidersTestingDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'bind to total'
        });

        Demographics.getInstance().getCategories().forEach(contactCategory => {
            this.slidersDiscovery.push(new SliderDiscoveryCategory(contactCategory.getName()));
        });

    }

    handleChange(): void {

        const blendable = this.iconBlendable.getState();
        const overall = this.sliderOverall.getValue();
        const bindToOverall = this.iconBoundToTotal.getState();
        this.sliderOverall.setDisabled(!bindToOverall);

        const multipliers: { [K in string] : number } = {};
        let updatedCategories: string[] = [];
        this.slidersDiscovery.forEach(sliderDiscovery => {
            if (sliderDiscovery.getValue() !== this.modification.getCategoryValue(sliderDiscovery.getName())) {
                updatedCategories.push(sliderDiscovery.getName());
            }
            multipliers[sliderDiscovery.getName()] = sliderDiscovery.getValue();
        });

        this.modification.acceptUpdate({
            multipliers,
            blendable,
            overall,
            bindToOverall
        });

        this.updateChart();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());

    }

    acceptModification(modification: ModificationDiscovery): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.iconBlendable.toggle(modification.isBlendable());
        this.iconBoundToTotal.toggle(modification.isBoundToTotal());

        this.sliderOverall.setDisabled(!modification.isBoundToTotal());
        this.sliderOverall.setValue(modification.getOverall());

        this.slidersDiscovery.forEach(sliderTesting => {
            sliderTesting.setValue(modification.getCategoryValue(sliderTesting.getName()));
        });
        this.iconBlendable.toggle(modification.isBlendable());

        this.updateChart();

    }

    updateChart(): void {

        const instant = this.modification.getInstantA();
        console.log('updating instant', TimeUtil.formatCategoryDate(instant));
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
            this.slidersDiscovery.forEach(sliderTesting => {
                sliderTesting.handleResize();
            });
        });
    }

}
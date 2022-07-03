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
import { StorageUtil } from '../storage/StorageUtil';
import { Slider } from '../gui/Slider';
import { ModelConstants } from '../../model/ModelConstants';
import { IconSlider } from '../gui/IconSlider';
import { ModificationResolverDiscovery } from '../../common/modification/ModificationResolverDiscovery';

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
    private readonly sliderTestRate: Slider;
    // private readonly sliderFactorWeight: Slider;
    private readonly slidersCorrections: Slider[];
    private readonly iconBlendable: IconToggle;

    private modification: ModificationDiscovery;

    constructor() {

        this.chartTesting = new ChartDiscovery('chartTestingDiv', 0.00, 1.01, ControlsConstants.LABEL_PERCENT___FIXED, ControlsConstants.LABEL_PERCENT__FLOAT_2);
        // this.slidersDiscovery = [];

        this.iconBlendable = new IconToggle({
            container: 'slidersTestingDiv',
            state: false,
            handleToggle: state => {
                this.handleChange();
            },
            label: 'smooth transition'
        });

        // this.sliderOverall = new SliderDiscoveryCategory('total');

        const container = document.createElement('div');
        container.classList.add('slider-modification');
        document.getElementById('slidersTestingDiv').appendChild(container);
        this.sliderTestRate = new Slider({
            container,
            min: Math.min(...ModelConstants.RANGE____PERCENTAGE__10),
            max: Math.max(...ModelConstants.RANGE____PERCENTAGE__10),
            step: 0.0001,
            values: [0.0],
            ticks: [...ModelConstants.RANGE____PERCENTAGE__10],
            label: 'test rate',
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
                } else {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`;
                }
            },
            handleValueChange: (index, value, type) => {
                if (type === 'stop' || type === 'input') {
                    this.handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value.replace(',', '.')) / 100;
                }
            }
        });


        // const container2 = document.createElement('div');
        // container2.classList.add('slider-modification');
        // document.getElementById('slidersTestingDiv').appendChild(container2);
        // this.sliderFactorWeight = new Slider({
        //     container: container2,
        //     min: Math.min(...factorWeightRange),
        //     max: Math.max(...factorWeightRange),
        //     step: 0.01,
        //     values: [0.0],
        //     ticks: [...factorWeightRange],
        //     label: 'test rate',
        //     thumbCreateFunction: (index: number) => {
        //         return new IconSlider();
        //     },
        //     labelFormatFunction: (index, value, type) => {
        //         return `${(value).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}`;

        //     },
        //     handleValueChange: (index, value, type) => {
        //         if (type === 'stop' || type === 'input') {
        //             this.handleChange();
        //         }
        //     },
        //     handleThumbPicked: (index) => {
        //         // nothing
        //     },
        //     inputFunctions: {
        //         inputFormatFunction: (index, value) => {
        //             return `${(value).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}`;
        //         },
        //         inputHandleFunction: (index, value) => {
        //             return parseFloat(value.replace(',', '.'));
        //         }
        //     }
        // });

        this.slidersCorrections = [];
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {

            const container = document.createElement('div');
            container.classList.add('slider-modification');
            document.getElementById('slidersTestingDiv').appendChild(container);

            this.slidersCorrections.push(new Slider({
                container,
                min: Math.min(...ModelConstants.RANGE____PERCENTAGE_100),
                max: Math.max(...ModelConstants.RANGE____PERCENTAGE_100),
                step: 0.01,
                values: [0.0],
                ticks: [...ModelConstants.RANGE____PERCENTAGE_100],
                label: ageGroup.getName(),
                thumbCreateFunction: (index: number) => {
                    return new IconSlider();
                },
                labelFormatFunction: (index, value, type) => {
                    if (type === 'tick') {
                        return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
                    } else {
                        return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}%`;
                    }
                },
                handleValueChange: (index, value, type) => {
                    if (type === 'stop' || type === 'input') {
                        this.handleChange();
                    }
                },
                handleThumbPicked: (index) => {
                    // nothing
                },
                inputFunctions: {
                    inputFormatFunction: (index, value) => {
                        return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_2)}`;
                    },
                    inputHandleFunction: (index, value) => {
                        return parseFloat(value.replace(',', '.')) / 100;
                    }
                }
            }));

        });

    }

    handleChange(): void {

        const blendable = this.iconBlendable.getState();
        const testRate = this.sliderTestRate.getValue(0);
        // const factorWeight = this.sliderFactorWeight.getValue(0);

        const corrections: { [K in string]: number } = {};
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            corrections[ageGroup.getName()] = this.slidersCorrections[ageGroup.getIndex()].getValue(0);
        });

        this.modification.acceptUpdate({
            corrections,
            blendable,
            testRate,
            // factorWeight
        });

        this.updateChart();

        SliderModification.getInstance().indicateUpdate(this.modification.getId());
        StorageUtil.getInstance().setSaveRequired(true);
        ControlsConstants.MODIFICATION_PARAMS[this.modification.getKey()].handleModificationUpdate(); // update model after modification update



    }

    acceptModification(modification: ModificationDiscovery): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        this.iconBlendable.toggle(modification.isBlendable());

        this.sliderTestRate.setValueAndRedraw(0, modification.getTestRate(), true);
        // this.sliderFactorWeight.setValueAndRedraw(0, modification.getFactorWeight(), true);
        Demographics.getInstance().getAgeGroups().forEach(ageGroup => {
            this.slidersCorrections[ageGroup.getIndex()].setValueAndRedraw(0, modification.getCorrectionValue(ageGroup.getIndex()), true);
        });
        this.iconBlendable.toggle(modification.isBlendable());

        this.updateChart();

    }

    updateChart(): void {

        const instant = this.modification.getInstantA();
        const modificationTime = ModificationTime.createInstance(instant);
        modificationTime.setInstants(instant, instant);

        requestAnimationFrame(() => {
            this.chartTesting.acceptModificationTime(modificationTime);
            // this.slidersDiscovery.forEach(sliderTesting => {
            //     sliderTesting.handleResize();
            // });
        });

    }

}
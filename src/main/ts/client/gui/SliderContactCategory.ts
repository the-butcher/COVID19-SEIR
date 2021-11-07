import { ChartAgeGroup } from './../chart/ChartAgeGroup';
import { ContactCategory } from '../../common/demographics/ContactCategory';
import { Demographics } from '../../common/demographics/Demographics';
import { ModificationContact } from '../../common/modification/ModificationContact';
import { ModelConstants } from '../../model/ModelConstants';
import { ControlsContact } from '../controls/ControlsContact';
import { ControlsConstants } from './ControlsConstants';
import { IconSlider } from './IconSlider';
import { Slider } from './Slider';

export class SliderContactCategory extends Slider {

    static readonly CLASS_CORRECTION_LABEL = 'correction-label';

    private readonly contactCategoryConfig: ContactCategory;
    private readonly ageGroupProfileDivs: HTMLDivElement[];
    private readonly ageGroupLabelDivs: HTMLDivElement[];


    private corrections: { [K in string] : number };

    constructor(contactCategoryConfig: ContactCategory) {

        const container = document.createElement('div');
        container.classList.add('slider-modification');
        document.getElementById('slidersCategoryDiv').appendChild(container);

        const canvasContainer = document.createElement('div');
        canvasContainer.style.width = '240px';
        canvasContainer.style.height = '28px';
        canvasContainer.style.position = 'absolute';
        canvasContainer.style.left = '20px';
        canvasContainer.style.top = '0px';

        container.appendChild(canvasContainer);

        const ticks = ModelConstants.RANGE____PERCENTAGE_100.slice(0, -1);

        super({
            container,
            min: Math.min(...ModelConstants.RANGE____PERCENTAGE_100),
            max: Math.max(...ModelConstants.RANGE____PERCENTAGE_100),
            step: 0.01, // 100
            values: [1.0],
            ticks,
            label: contactCategoryConfig.getName(),
            thumbCreateFunction: (index: number) => {
                return new IconSlider();
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}%`;
                } else {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}%`;
                }
            },
            handleValueChange: (value, index, type) => {
                if (type === 'stop' || type === 'input') {
                    ControlsContact.getInstance().handleChange();
                }
            },
            handleThumbPicked: (index) => {
                // nothing
            },
            inputFunctions: {
                inputFormatFunction: (index, value) => {
                    return `${(value * 100).toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FLOAT_1)}`;
                },
                inputHandleFunction: (index, value) => {
                    return parseFloat(value) / 100;
                }
            }
        });

        this.corrections = {};

        const ageGroups = Demographics.getInstance().getAgeGroups();
        this.ageGroupProfileDivs = [];
        this.ageGroupLabelDivs = [];

        const xStp = 240 / ageGroups.length;

        ageGroups.forEach(ageGroup => {

            const ageGroupProfileContainer = document.createElement('div');

            ageGroupProfileContainer.style.position = 'absolute';
            ageGroupProfileContainer.style.left = `${xStp * ageGroup.getIndex()}px`;
            ageGroupProfileContainer.style.top = `0px`;
            ageGroupProfileContainer.style.width = `${xStp}px`;
            ageGroupProfileContainer.style.height = '40px';

            const ageGroupProfileDiv = document.createElement('div');
            ageGroupProfileDiv.style.position = 'absolute';
            ageGroupProfileDiv.style.left = '1px';
            ageGroupProfileDiv.style.bottom = '13px';
            ageGroupProfileDiv.style.width = 'calc(100% - 2px)';
            ageGroupProfileDiv.style.height = '27px';
            ageGroupProfileDiv.style.backgroundColor = '#444444';
            ageGroupProfileDiv.style.transition = 'top 250ms ease-in-out, height 250ms ease-in-out';
            this.ageGroupProfileDivs.push(ageGroupProfileDiv);
            ageGroupProfileContainer.appendChild(ageGroupProfileDiv);

            const ageGroupLabelDiv = document.createElement('div');
            ageGroupLabelDiv.classList.add('correction-label');
            ageGroupLabelDiv.style.width = 'calc(100% - 2px)';
            ageGroupLabelDiv.innerHTML = '10%';
            ageGroupLabelDiv.style.display = 'none';
            this.ageGroupLabelDivs.push(ageGroupLabelDiv);
            ageGroupProfileContainer.appendChild(ageGroupLabelDiv);
            canvasContainer.appendChild(ageGroupProfileContainer);

            const svgElementMore = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgElementMore.setAttributeNS(null, 'viewBox', '-5 -5 10 10');
            svgElementMore.style.position = 'absolute';
            svgElementMore.style.left = `${xStp / 2}px`;
            svgElementMore.style.display = 'none';
            svgElementMore.style.width = '12px';
            svgElementMore.style.height = '12px';
            svgElementMore.addEventListener('pointerover', e => {
                svgElementLess.setAttributeNS(null, 'fill', '#666666');
            });
            svgElementMore.addEventListener('pointerout', e => {
                svgElementLess.setAttributeNS(null, 'fill', '#444444');
            });
            svgElementMore.addEventListener('pointerup', e => {
                this.moreCorrection(ageGroup.getName());
            });

            const pathMore = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathMore.setAttributeNS(null, 'fill', '#444444');
            pathMore.setAttributeNS(null, 'd', 'M 3.52 -4.48 H -3.52 C -4.05 -4.48 -4.48 -4.05 -4.48 -3.52 V 3.52 C -4.48 4.05 -4.05 4.48 -3.52 4.48 H 3.52 C 4.05 4.48 4.48 4.05 4.48 3.52 V -3.52 C 4.48 -4.05 4.05 -4.48 3.52 -4.48 Z M 2.88 0.56 C 2.88 0.692 2.772 0.8 2.64 0.8 H 0.8 V 2.64 C 0.8 2.772 0.692 2.88 0.56 2.88 H -0.56 C -0.692 2.88 -0.8 2.772 -0.8 2.64 V 0.8 H -2.64 C -2.772 0.8 -2.88 0.692 -2.88 0.56 V -0.56 C -2.88 -0.692 -2.772 -0.8 -2.64 -0.8 H -0.8 V -2.64 C -0.8 -2.772 -0.692 -2.88 -0.56 -2.88 H 0.56 C 0.692 -2.88 0.8 -2.772 0.8 -2.64 V -0.8 H 2.64 C 2.772 -0.8 2.88 -0.692 2.88 -0.56 V 0.56 Z');
            svgElementMore.appendChild(pathMore);

            const svgElementLess = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgElementLess.setAttributeNS(null, 'viewBox', '-5 -5 10 10');
            svgElementLess.setAttributeNS(null, 'fill', '#444444');
            svgElementLess.style.position = 'absolute';
            svgElementLess.style.left = '0px';
            svgElementLess.style.display = 'none';
            svgElementLess.style.width = '12px';
            svgElementLess.style.height = '12px';
            svgElementLess.style.cursor = 'pointer';
            svgElementLess.addEventListener('pointerover', e => {
                svgElementLess.setAttributeNS(null, 'fill', '#666666');
            });
            svgElementLess.addEventListener('pointerout', e => {
                svgElementLess.setAttributeNS(null, 'fill', '#444444');
            });
            svgElementLess.addEventListener('pointerup', e => {
                this.lessCorrection(ageGroup.getName());
            });

            const pathLess = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathLess.setAttributeNS(null, 'd', 'M 3.52 -4.48 H -3.52 C -4.05 -4.48 -4.48 -4.05 -4.48 -3.52 V 3.52 C -4.48 4.05 -4.05 4.48 -3.52 4.48 H 3.52 C 4.05 4.48 4.48 4.05 4.48 3.52 V -3.52 C 4.48 -4.05 4.05 -4.48 3.52 -4.48 Z M -2.64 0.8 C -2.772 0.8 -2.88 0.692 -2.88 0.56 V -0.56 C -2.88 -0.692 -2.772 -0.8 -2.64 -0.8 H 2.64 C 2.772 -0.8 2.88 -0.692 2.88 -0.56 V 0.56 C 2.88 0.692 2.772 0.8 2.64 0.8 H -2.64 Z');
            svgElementLess.appendChild(pathLess);

            ageGroupProfileContainer.appendChild(svgElementMore);
            ageGroupProfileContainer.appendChild(svgElementLess);

            const isLess = (e: MouseEvent) => {
                const boundingRect = ageGroupProfileDiv.getBoundingClientRect();
                return e.clientX < boundingRect.left + boundingRect.width / 2;
            };
            const lessMore = (e: MouseEvent) => {
                if (isLess(e)) {
                    svgElementLess.style.display = 'block';
                    svgElementMore.style.display = 'none';
                } else {
                    svgElementLess.style.display = 'none';
                    svgElementMore.style.display = 'block';
                }
            };

            ageGroupProfileContainer.addEventListener('pointermove', lessMore);
            ageGroupProfileContainer.addEventListener('pointerover', e => {
                lessMore(e);
                this.ageGroupLabelDivs[ageGroup.getIndex()].style.display = 'block';
            });
            ageGroupProfileContainer.addEventListener('pointerout', e => {
                svgElementLess.style.display = 'none';
                svgElementMore.style.display = 'none';
                this.ageGroupLabelDivs[ageGroup.getIndex()].style.display = 'none';
            });

            ageGroupProfileDiv.addEventListener('dblclick', e => {
                this.resetCorrections();
            });


        });

        this.setLabelPosition(13);
        this.contactCategoryConfig = contactCategoryConfig;

    }

    getCorrections(): { [K in string] : number } {
        const corrections = {};
        let isCorrected = false;
        for (const k in this.corrections) {
            if (this.corrections[k] !== 1) {
                corrections[k] = this.corrections[k];
                isCorrected = true;
            }
        }
        if (isCorrected) {
            return corrections;
        } else {
            return undefined;
        }
    }

    resetCorrections(): void {
        this.corrections = {};
        ControlsContact.getInstance().handleCorrections(this.corrections);
        this.redrawCanvas();
    }

    lessCorrection(ageGroupName: string): void {
        if (!this.corrections[ageGroupName]) {
            this.corrections[ageGroupName] = 1;
        }
        this.corrections[ageGroupName] = this.corrections[ageGroupName] - 0.01;
        ControlsContact.getInstance().handleCorrections(this.corrections);
        this.redrawCanvas();
    }

    moreCorrection(ageGroupName: string): void {
        if (!this.corrections[ageGroupName]) {
            this.corrections[ageGroupName] = 1;
        }
        this.corrections[ageGroupName] = this.corrections[ageGroupName] + 0.01;
        ControlsContact.getInstance().handleCorrections(this.corrections);
        this.redrawCanvas();
    }

    setValueAndRedraw(index: number, value: number, animated: boolean): void {
        super.setValueAndRedraw(index, value, animated);
        this.redrawCanvas();
    }

    acceptModification(modification: ModificationContact): void {

        // reset, so none of the previous values remains
        this.corrections = {};

        const ageGroups = Demographics.getInstance().getAgeGroups();
        ageGroups.forEach(ageGroup => {
            const correction = modification.getCorrectionValue(ageGroup.getIndex());;
            if (correction !== 1) {
                this.corrections[ageGroup.getName()] = correction;
            }
            // this.corrections[ageGroup.getName()] = modification.getCorrectionValue(this.contactCategoryConfig.getName(), ageGroup.getIndex());
        });

        // console.warn('this.corrections', this.contactCategoryConfig.getName(), this.corrections);
        this.redrawCanvas();

    }

    redrawCanvas(): void {

        const ageGroups = Demographics.getInstance().getAgeGroups();
        const scale = 0.75 * this.getValue();

        ageGroups.forEach(ageGroup => {

            const ageGroupProfileDiv = this.ageGroupProfileDivs[ageGroup.getIndex()];
            const value = this.contactCategoryConfig.getColumnValue(ageGroup.getIndex()) * scale + 1;

            // ageGroupProfileDiv.style.top = `${27 - value}px`;
            ageGroupProfileDiv.style.height = `${value}px`;
            ageGroupProfileDiv.style.backgroundColor = '#444444';

            const correction = this.corrections[ageGroup.getName()];
            if (correction) {

                this.ageGroupLabelDivs[ageGroup.getIndex()].innerHTML = ControlsConstants.LABEL_PERCENT___FIXED.format(Math.abs(correction - 1));

                if (correction < 1) {
                    ageGroupProfileDiv.style.backgroundColor = '#884444';
                } else if (correction > 1) {
                    ageGroupProfileDiv.style.backgroundColor = '#448844';
                } else {
                    ageGroupProfileDiv.style.backgroundColor = '#444444';
                }

            } else {
                this.ageGroupLabelDivs[ageGroup.getIndex()].innerHTML = ControlsConstants.LABEL_PERCENT___FIXED.format(0);
                ageGroupProfileDiv.style.backgroundColor = '#444444';
            }

        });

    }

    getName(): string {
        return this.contactCategoryConfig.getName();
    }

    getValue(): number {
        return this.getSliderThumbs()[0].getValue();
    }

    setValue(value: number): void {
        const thumbElement = this.getSliderThumbs()[0];
        thumbElement.setValue(value);
        this.redrawSliderElement(thumbElement, 7, true);
    }

}
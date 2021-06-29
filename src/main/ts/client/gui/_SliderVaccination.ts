// import { ControlsConstants } from './ControlsConstants';
// import { ControlsVaccination } from '../controls/ControlsVaccination';
// import { ModelConstants } from '../../model/ModelConstants';
// import { IconSlider } from './IconSlider';
// import { Slider } from './Slider';

// export class SliderVaccination extends Slider {

//     constructor(max: number) {

//         const container = document.createElement('div');
//         container.classList.add('slider-modification');

//         document.getElementById('slidersVaccinationDiv').appendChild(container);

//         const tick = max / 4;
//         const ticks = [
//             0, tick, tick * 2, tick * 3 , tick * 4
//         ]

//         super({
//             container,
//             min: 0,
//             max: max,
//             step: 1000,
//             values: [0],
//             ticks,
//             label: 'doses per day',
//             thumbCreateFunction: (index: number) => {
//                 return new IconSlider();
//             },
//             labelFormatFunction: (index, value, type) => {
//                 return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
//             },
//             handleValueChange: (value, index, type) => {
//                 if (type === 'stop' || type === 'input') {
//                     ControlsVaccination.getInstance().handleChange();
//                 }
//             },
//             handleThumbPicked: (index) => {
//                 // nothing
//             },
//             inputFunctions: {
//                 inputFormatFunction: (index, value) => {
//                     return `${value.toLocaleString(undefined, ControlsConstants.LOCALE_FORMAT_FIXED)}`;
//                 },
//                 inputHandleFunction: (index, value) => {
//                     return parseFloat(value);
//                 }
//             }
//         });

//     }

//     getValue(): number {
//         return this.getSliderThumbs()[0].getValue();
//     }

//     setValue(value: number): void {
//         const thumbElement = this.getSliderThumbs()[0];
//         thumbElement.setValue(value);
//         this.redrawSliderElement(thumbElement, 7, true);
//     }

// }
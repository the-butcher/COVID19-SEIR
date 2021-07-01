import { ICoordinate } from './../../util/ICoordinate';
import { ICompartment } from './../../model/compartment/ICompartment';
import { ControlsConstants } from './ControlsConstants';


export class IconBezierHandle {

    private readonly svgContainer: HTMLDivElement;

    constructor() {

        this.svgContainer = document.createElement('div');
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.zIndex = '250';

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttributeNS(null, 'viewBox', '-15 -15 30 30');
        svgElement.style.width = '28px';
        svgElement.style.height = '28px';
        this.svgContainer.appendChild(svgElement);

        const bulletPathElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bulletPathElement.setAttributeNS(null, 'stroke', '#FF0000');
        bulletPathElement.setAttributeNS(null, 'stroke-width', '2');
        bulletPathElement.setAttributeNS(null, 'r', '4');
        svgElement.appendChild(bulletPathElement);

        document.getElementById('layoutDivRoot').appendChild(this.svgContainer);


    }

    getCoordinate(): ICoordinate {
        return {
            x: this.svgContainer.offsetLeft + 14,
            y: this.svgContainer.offsetTop + 14
        }
    }

    showAt(point: ICoordinate): void {
        this.svgContainer.style.display = 'block';
        this.svgContainer.style.left = `${point.x - 14}px`;
        this.svgContainer.style.top = `${point.y - 14}px`;
    }

    hide(): void {
        this.svgContainer.style.display = 'none';
    }

    getSvgContainer(): HTMLDivElement {
        return this.svgContainer;
    }

}
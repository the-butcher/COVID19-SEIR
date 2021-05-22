import { ModelConstants } from '../../model/ModelConstants';

export class IconSlider {

    static readonly PATH_OUTER = 'M -5.13 8.82 V -8.82 C -5.13 -9.63 -4.5 -10.35 -3.6 -10.35 H 3.6 C 4.5 -10.35 5.13 -9.63 5.13 -8.82 V 8.82 C 5.13 9.63 4.5 10.35 3.6 10.35 H -3.6 C -4.5 10.35 -5.13 9.63 -5.13 8.82 Z';
    static readonly PATH_INNER = 'm -0.9 6.9 v -13.8 c 0 -0.3 -0.2 -0.5 -0.5 -0.5 h -1.1 c -0.3 0 -0.5 0.2 -0.5 0.5 v 13.8 c 0 0.3 0.2 0.5 0.5 0.5 h 1.1 c 0.3 0 0.5 -0.2 0.5 -0.5 z m 3.9 0 v -13.8 c 0 -0.3 -0.2 -0.5 -0.5 -0.5 h -1.1 c -0.3 0 -0.5 0.2 -0.5 0.5 v 13.8 c 0 0.3 0.2 0.5 0.5 0.5 h 1.1 c 0.3 0 0.5 -0.2 0.5 -0.5 z';

    static readonly HANDLE_OPACITY_INACTIVE = '0.6';
    static readonly HANDLE_OPACITY___ACTIVE = '0.8';

    private readonly svgContainer: HTMLDivElement;
    private readonly bulletGroupElement: SVGGElement;
    private readonly bulletPathOuter: SVGPathElement;

    constructor() {

        this.svgContainer = document.createElement('div');
        this.svgContainer.style.filter = 'drop-shadow(2px 2px 3px var(--color-dropshadow))';

        this.svgContainer.style.width = '280px';
        this.svgContainer.style.height = '37px';
        this.svgContainer.style.left = '-14.5px';
        this.svgContainer.style.top = '0px';
        this.svgContainer.style.pointerEvents = 'none';
        this.svgContainer.style.position = 'absolute';

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttributeNS(null, 'viewBox', '-14 -15 300 40');
        svgElement.style.width = '280px';
        svgElement.style.height = '37px';
        svgElement.style.pointerEvents = 'none';
        this.svgContainer.appendChild(svgElement);

        /**
         * container for the bullet itself
         */
        this.bulletGroupElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
        this.bulletGroupElement.style.pointerEvents = 'visible';
        svgElement.appendChild(this.bulletGroupElement);
        this.bulletGroupElement.style.transform = 'scale(0.8)';

        /**
         * bullet background
         */
        this.bulletPathOuter = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.bulletPathOuter.style.fill = '#777777';
        this.bulletPathOuter.setAttributeNS(null, 'd', IconSlider.PATH_OUTER);
        this.bulletGroupElement.appendChild(this.bulletPathOuter);

        const iconPathInner = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPathInner.style.fill = ModelConstants.COLOR______BG;
        iconPathInner.style.opacity = '0.5';
        iconPathInner.setAttributeNS(null, 'd', IconSlider.PATH_INNER);
        this.bulletGroupElement.appendChild(iconPathInner);

    }

    setFocussed(focussed: boolean): void {
        this.bulletPathOuter.style.fill = focussed ? ModelConstants.COLOR____FONT : '#777777';
    }

    getBulletGroupElement(): SVGGElement {
        return this.bulletGroupElement;
    }

    getSvgContainer(): HTMLDivElement {
        return this.svgContainer;
    }

}
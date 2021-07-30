import { MODIFICATION____KEY } from '../../model/ModelConstants';
import { ControlsConstants } from './ControlsConstants';
import { ModelActions } from './ModelActions';

export interface IIconToggleParams {
    handleToggle: (state: boolean) => void;
    label: string;
    state: boolean;
    container: string;
}

export class IconToggle {

    /**
    <div style="width: inherit; display: flex; flex-direction: row; padding: 12px 0px 12px 16px">
        <div style="width: 20x; height: 20px;" >
            <svg xmlns="http://www.w3.org/2000/svg" style="height: inherit; width: inherit; stroke-width: 1px" viewbox="-15 -15 45 30">
                <path style="transition: transform 250ms ease-in-out; fill: var(--color-text); stroke: var(--color-text)" d="M 12.4 -12.4 H 0 C -6.85 -12.4 -12.4 -6.85 -12.4 0 S -6.85 12.4 0 12.4 H 15 C 21.85 12.4 27.41 6.85 27.41 0 S 21.85 -12.4 15 -12.4 Z" />
                <path style="transition: transform 250ms ease-in-out; transform: scale(1.2, 1.2) translate(0px, 0px ); fill: var(--color-panel-bg); stroke: var(--color-text)" d="M 0 8.27 C -4.57 8.27 -8.27 4.57 -8.27 0 C -8.27 -4.57 -4.56 -8.27 0 -8.27 C 4.58 -8.27 8.27 -4.57 8.27 0 C 8.27 4.57 4.57 8.27 0 8.27 Z" />
            </svg>
        </div>
        <div style="font-size: 12px; width: 200px; padding: 3px 0px 0px 4px">interpolate from previous</div>
    </div>
     */

    private readonly outerPath: SVGPathElement;
    private readonly innerPath: SVGPathElement;
    private state: boolean;
    private readonly handleToggle: (state: boolean) => void;

    constructor(params: IIconToggleParams) {

        this.state = params.state;
        this.handleToggle = params.handleToggle;

        const outerContainer = document.createElement('div');
        outerContainer.classList.add('toggle-outer');
        outerContainer.addEventListener('pointerup', e => {
            this.toggle(!this.state);
            this.handleToggle(this.state);
        });
        document.getElementById(params.container).append(outerContainer);

        const innerContainer = document.createElement('div');
        innerContainer.classList.add('toggle-inner');
        outerContainer.appendChild(innerContainer);

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttributeNS(null, 'viewBox', '-15 -15 45 30');
        svgElement.style.height = 'inherit';
        svgElement.style.width = 'inherit';
        svgElement.style.strokeWidth = '1px';
        innerContainer.appendChild(svgElement);

        this.outerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.outerPath.style.transition = 'fill';
        this.outerPath.style.fill = 'var(--color-text)';
        this.outerPath.style.stroke = 'var(--color-text)';
        this.outerPath.setAttributeNS(null, 'd', 'M 12.4 -12.4 H 0 C -6.85 -12.4 -12.4 -6.85 -12.4 0 S -6.85 12.4 0 12.4 H 15 C 21.85 12.4 27.41 6.85 27.41 0 S 21.85 -12.4 15 -12.4 Z');
        svgElement.appendChild(this.outerPath);

        this.innerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.innerPath.style.transition = 'transform 250ms ease-in-out';
        this.innerPath.style.transform = 'scale(1.2, 1.2) translate(10px, 0px)';
        this.innerPath.style.fill = 'var(--color-panel-bg)';
        this.innerPath.style.stroke = 'var(--color-text)';
        this.innerPath.setAttributeNS(null, 'd', 'M 0 8.27 C -4.57 8.27 -8.27 4.57 -8.27 0 C -8.27 -4.57 -4.56 -8.27 0 -8.27 C 4.58 -8.27 8.27 -4.57 8.27 0 C 8.27 4.57 4.57 8.27 0 8.27 Z');
        svgElement.appendChild(this.innerPath);

        const labelContainer = document.createElement('div');
        labelContainer.innerHTML = params.label;
        labelContainer.style.fontSize = '12px';
        labelContainer.style.width = '200px';
        labelContainer.style.padding = '5px 0px 0px 4px';
        outerContainer.appendChild(labelContainer);

        this.toggle(this.state);

    }

    getState(): boolean {
        return this.state;
    }

    toggle(state: boolean ): void {
        this.state = state;
        if (this.state) {
            this.innerPath.style.transform = 'scale(1.2, 1.2) translate(12px, 0px)';
            this.outerPath.style.fill = 'var(--color-text)';
        } else {
            this.innerPath.style.transform = 'scale(1.0, 1.0) translate(0px, 0px)';
            this.outerPath.style.fill = 'var(--color-panel-bg)';
        }
    }

}
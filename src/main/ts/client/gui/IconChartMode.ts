import { IChartModeParams } from './ModelActions';

export class IconChartMode {

    private readonly iconMode: string;
    private readonly label: string;
    private readonly container: HTMLDivElement;

    constructor(params: IChartModeParams) {

        this.iconMode = params.iconMode;
        this.label = params.label;

        this.container = document.createElement('div');
        this.container.classList.add('chart-mode');
        this.container.innerHTML = this.label;

        document.getElementById(params.container).appendChild(this.container);

        this.container.addEventListener('click', e => {
            params.handleClick(e);
        });

    }

    getIconMode(): string {
        return this.iconMode;
    }

    setActive(active: boolean): void {
        this.container.style.color = active ? 'unset' : '#aaaaaa';
        this.container.innerHTML = active ? `&lt;&nbsp;${this.label}` : `&nbsp;&nbsp;${this.label}`;
    }

}
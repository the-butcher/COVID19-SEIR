import { IChartModeParams } from './ModelActions';

export class IconChartMode {

    private readonly iconKey: any;
    private readonly label: string;
    private readonly container: HTMLDivElement;

    constructor(params: IChartModeParams) {

        this.iconKey = params.iconKey;
        this.label = params.label;

        this.container = document.createElement('div');
        this.container.classList.add('chart-mode');
        this.container.innerHTML = this.label;

        document.getElementById(params.container).appendChild(this.container);

        this.container.addEventListener('click', e => {
            params.handleClick(e);
        });

    }

    getIconKey(): any {
        return this.iconKey;
    }

    setActive(active: boolean): void {
        this.container.style.color = active ? 'unset' : '#aaaaaa';
        this.container.innerHTML = active ? `&lt;&nbsp;${this.label}` : `&nbsp;&nbsp;${this.label}`;
    }

}
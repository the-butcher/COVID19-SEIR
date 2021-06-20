import { ContactCategory } from './../../common/demographics/ContactCategory';
import { CHART_MODE______KEY } from './ControlsConstants';
import { IChartModeParams, ModelActions } from './ModelActions';

export class IconChartMode {

    private readonly chartMode: CHART_MODE______KEY;
    private readonly label: string;
    private readonly container: HTMLDivElement;

    constructor(params: IChartModeParams) {

        this.chartMode = params.chartMode;
        this.label = params.label;

        this.container = document.createElement('div');
        this.container.classList.add('chart-mode');
        this.container.innerHTML = this.label;

        document.getElementById('legendDiv').appendChild(this.container);

        this.container.addEventListener('click', e => {
            ModelActions.getInstance().toggleChartMode(this.chartMode);
        });

    }

    getChartMode(): CHART_MODE______KEY {
        return this.chartMode;
    }

    setActive(active: boolean): void {
        this.container.style.color = active ? 'unset' : '#aaaaaa';
        this.container.innerHTML = active ? `&lt;&nbsp;${this.label}` : `&nbsp;&nbsp;${this.label}`;
    }

}
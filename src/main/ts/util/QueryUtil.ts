import { WORKER_MODE } from '../client/ModelTask';
import { ObjectUtil } from './ObjectUtil';


export class QueryUtil {

    static readonly WORKER_MODES: WORKER_MODE[] = ['REGRESSION', 'PROJECTION', 'REBUILDING'];

    static getInstance(): QueryUtil {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new QueryUtil();
        }
        return this.instance;
    }
    private static instance: QueryUtil;

    private readonly diffDisplay: boolean;
    private readonly workerMode: WORKER_MODE;
    private readonly config: string;

    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.diffDisplay = urlParams.has('dd') && urlParams.get('dd') === 'true';
        this.workerMode = urlParams.has('wm') && QueryUtil.WORKER_MODES.indexOf(urlParams.get('wm') as WORKER_MODE) >= 0 ? urlParams.get('wm') as WORKER_MODE  : 'PROJECTION';
        this.config = urlParams.get('config');
    }

    isDiffDisplay(): boolean {
        return this.diffDisplay;
    }

    getWorkerMode(): WORKER_MODE {
        return this.workerMode;
    }

    getConfig(): string {
        return this.config;
    }

}
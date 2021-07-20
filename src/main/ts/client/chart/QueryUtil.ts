import { ObjectUtil } from '../../util/ObjectUtil';

export class QueryUtil {

    static getInstance(): QueryUtil {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new QueryUtil();
        }
        return this.instance;
    }
    private static instance: QueryUtil;

    private readonly diffDisplay: boolean;

    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.diffDisplay = urlParams.has('dd') && urlParams.get('dd') === 'true';
    }

    isDiffDisplay(): boolean {
        return this.diffDisplay;
    }

}
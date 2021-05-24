import { TimeUtil } from './../../util/TimeUtil';
import { ModelConstants } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup, IModificationData } from '../chart/ChartAgeGroup';
import { ChartUtil } from '../chart/ChartUtil';
import { SliderModification } from '../gui/SliderModification';
import { SliderSeasonality } from '../gui/SliderSeasonality';
import { Controls } from './Controls';
import { Modifications } from '../../common/modification/Modifications';
import { ModificationSeasonality } from '../../common/modification/ModificationSeasonality';
import { ControlsConstants } from '../gui/ControlsConstants';

export class ControlsSeasonality {

    static getInstance(): ControlsSeasonality {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsSeasonality();
        }
        return this.instance;
    }
    private static instance: ControlsSeasonality;

    static rebuildModificationData(): void {

        const modificationData: IModificationData[] = [];
        const modificationSeasonality = Modifications.getInstance().findModificationsByType('SEASONALITY')[0] as ModificationSeasonality;
        const maxSeasonalityInstant = modificationSeasonality.getInstantA(); // the instant where amount of seasonality is at it's max
        // console.log('-------------------');

        // let 365 be "radius" of the cosine function and maxInstant "zero"
        const minInstant = SliderModification.getInstance().getMinValue();
        const maxInstant = SliderModification.getInstance().getMaxValue();
        const millisYear = TimeUtil.MILLISECONDS_PER_DAY * 365;

        let cosine: number;
        let value: number;
        for (let instant = minInstant; instant <= maxInstant; instant += TimeUtil.MILLISECONDS_PER_DAY) {
            cosine = Math.cos((instant - maxSeasonalityInstant) % millisYear / millisYear * Math.PI * 2); // 1 at maxSeasonality, -1 at min
            value = 1 - (cosine + 1) * 0.5 * (1 - modificationSeasonality.getAmount()); // 1 at max seasonality, 0 at min
            // value = 1 - (cosine + 1) * 0.5 * modificationSeasonality.getAmount();
            // cosine = (Math.cos((instant - maxSeasonalityInstant) % millisYear / millisYear * Math.PI * 2) + 1) * 0.5 * modificationSeasonality.getAmount();
            // console.log('radians', new Date(instant), cosine);
            modificationData.push({
                modValueY: value,
                categoryX: TimeUtil.formatCategoryDate(instant)
            });
        }

        ChartAgeGroup.getInstance().showModifications({
            min: 0,
            max: 1,
            percent: true,
            text: 'SEASONALITY',
            color: ControlsConstants.COLORS['SEASONALITY'],
            useObjectColors: true
        }, modificationData);

    }

    private sliderAmount: SliderSeasonality;

    private modification: ModificationSeasonality;

    constructor() {
        this.sliderAmount = new SliderSeasonality();
    }

    handleChange(): void {
        this.modification.acceptUpdate({
            amount: this.sliderAmount.getValue()
        });
        ControlsSeasonality.rebuildModificationData();
        SliderModification.getInstance().indicateUpdate(this.modification.getId());
    }

    acceptModification(modification: ModificationSeasonality): void {
        Controls.acceptModification(modification);
        this.modification = modification;
        this.sliderAmount.setValue(this.modification.getAmount());
    }

}
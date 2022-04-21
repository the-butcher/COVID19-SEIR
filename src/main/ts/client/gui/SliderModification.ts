import { ChartAgeGroup } from './../chart/ChartAgeGroup';
import { ChartContactMatrix } from './../chart/ChartContactMatrix';
import { Modifications } from '../../common/modification/Modifications';
import { ModelConstants, MODIFICATION____KEY } from '../../model/ModelConstants';
import { ObjectUtil } from '../../util/ObjectUtil';
import { StorageUtil } from '../storage/StorageUtil';
import { IModificationValues } from './../../common/modification/IModificationValues';
import { ModelInstants } from './../../model/ModelInstants';
import { TimeUtil } from './../../util/TimeUtil';
import { ControlsConstants } from './ControlsConstants';
import { IconModification } from './IconModification';
import { IconModificationMini } from './IconModificationMini';
import { Slider } from './Slider';

/**
 * slider control showing modifications of given types
 */
export class SliderModification extends Slider {

    // static readonly PATH_D_EDIT = "M 0 12.4 C -6.85 12.4 -12.4 6.85 -12.4 0 S -6.85 -12.4 0 -12.4 S 12.4 -6.85 12.4 0 S 6.85 12.4 0 12.4 Z M 6.8982 -5.1841 L 5.1844 -6.8979 C 4.6498 -7.4325 3.7828 -7.4325 3.2482 -6.8979 L 1.6359 -5.2856 L 5.2859 -1.6356 L 6.8982 -3.2479 C 7.4328 -3.7828 7.4328 -4.6495 6.8982 -5.1841 Z M 0.9904 -4.6407 L -6.9331 3.2823 L -7.2952 6.539 L -6.5402 7.2948 L -3.2858 6.9355 L 4.6403 -0.9906 Z";
    // static readonly PATH_D_CHECK = "M 0 12.4 C -6.85 12.4 -12.4 6.85 -12.4 0 S -6.85 -12.4 0 -12.4 S 12.4 -6.85 12.4 0 S 6.85 12.4 0 12.4 Z M -1.4199 6.5001 L 7.6881 -2.6079 C 7.9973 -2.9171 7.9973 -3.4187 7.6881 -3.7279 L 6.5681 -4.8479 C 6.2589 -5.1573 5.7573 -5.1573 5.4481 -4.8479 L -1.98 2.5798 L -5.448 -0.8882 C -5.7572 -1.1974 -6.2588 -1.1974 -6.568 -0.8882 L -7.688 0.2318 C -7.9972 0.541 -7.9972 1.0426 -7.688 1.3518 L -2.54 6.4998 C -2.2306 6.8092 -1.7292 6.8092 -1.42 6.4999 Z";

    static getInstance(): SliderModification {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new SliderModification();
        }
        return this.instance;
    }
    private static instance: SliderModification;

    private readonly modificationIcons: IconModification[];
    private selectableModificationId: string;

    private readonly ticks: number[];

    constructor() {

        const ticks = ModelInstants.getInstance().getTicks();
        super({
            container: 'sliderDivTime',
            min: Math.min(...ticks),
            max: Math.max(...ticks),
            step: TimeUtil.MILLISECONDS_PER____DAY,
            values: [],
            ticks,
            label: 'date',
            thumbCreateFunction: (index: number) => {
                return new IconModification('x', 'CONTACT', 'create'); // TODO could this be optional
            },
            labelFormatFunction: (index, value, type) => {
                if (type === 'tick') {
                    return `${TimeUtil.formatCategoryDateFull(value)}`;
                } else {
                    return `${TimeUtil.formatCategoryDateDay(value)}`;
                }
            },
            handleValueChange: (index, value, type) => {
                const modification = Modifications.getInstance().findModificationById(this.modificationIcons[index].getId());
                ControlsConstants.MODIFICATION_PARAMS[modification.getKey()].handleModificationDrag(value);
                if (type === 'stop') {

                    this.updateModificationInstants();
                    this.handleThumbPicked(index);

                    this.indicateUpdate(this.modificationIcons[index].getId());
                    StorageUtil.getInstance().setSaveRequired(true);
                    ControlsConstants.MODIFICATION_PARAMS[modification.getKey()].handleModificationUpdate(); // update model after modification update

                }
                // if (type === 'cursor') {
                //     ControlsTime.getInstance().getChartContactMatrix().exportToPng();
                // }
            },
            handleThumbPicked: (index) => {
                if (index >= 0) {
                    const modification = Modifications.getInstance().findModificationById(this.modificationIcons[index].getId());
                    ControlsConstants.MODIFICATION_PARAMS[modification.getKey()].showInEditor(modification);
                    ChartAgeGroup.getInstance().updateModificationInstant(modification.getInstantA(), modification.getName(), ControlsConstants.COLORS[modification.getKey()]); // update marker in age group chart
                }
            }
        });
        this.ticks = ticks;
        this.modificationIcons = [];

    }

    getTickValues(): number[] {
        return this.ticks;
    }

    setSliderPadding(paddingLeft: number, paddingRight: number): void {
        this.getContainer().style.paddingLeft = `${paddingLeft}px`;
        this.getContainer().style.paddingRight = `${paddingRight}px`;
        requestAnimationFrame(() => {
            this.handleResize();
        });
    }

    /**
     * wiggle the icon, update primary chart
     * @param id
     */
    indicateUpdate(id: string): void {

        const modificationIcon = this.modificationIcons.find(m => m.getId() === id);

        // const previousTransform = modificationIcon.getBulletGroupElement().style.transform;
        modificationIcon.getBulletGroupElement().style.transform = IconModification.TRANSFORM_OUT;

        this.findThumbById(id).getThumbContentContainer().focus()

        StorageUtil.getInstance().setSaveRequired(true);

        setTimeout(() => {
            modificationIcon.getBulletGroupElement().style.transform = IconModification.TRANSFORM__IN;
        }, 300);

    }

    /**
     * find the modification with the given index and update it's ending instant
     * @param index
     * @param value
     */
    updateModificationInstant(index: number, value: number): void {
        const modification = Modifications.getInstance().findModificationById(this.modificationIcons[index].getId());
        const instantA = value;
        const instantB = (index < this.getSliderThumbs().length - 1) ? this.getSliderThumbs()[index + 1].getValue() : this.getMaxValue();
        modification.setInstants(instantA, instantB);
    }

    /**
     * update all modification's ending instants, then update the modification chart
     */
    updateModificationInstants(): void {
        for (let index = 0; index < this.getSliderThumbs().length; index++) {
            this.updateModificationInstant(index, this.getValue(index));
        }
    }

    /**
     * gets all active modification of the given type and shows them on the modification timeslider
     * @param key
     */
    showModifications(key: MODIFICATION____KEY): void {

        const typedModifications = Modifications.getInstance().findModificationsByType(key);

        // remove any previous thumbs
        this.clearThumbs();
        this.clearAssets();
        this.modificationIcons.length = 0;

        const allModifications = Modifications.getInstance().getAllModifications();
        for (let modificationIndex = 0; modificationIndex < allModifications.length; modificationIndex++) {
            const modification = allModifications[modificationIndex];
            if (modification.getKey() !== key) {
                const modificationIconMini = new IconModificationMini(modification.getKey());
                const asset = this.createAsset(modification.getInstantA(), modificationIndex, {
                    thumbCreateFunction: (index: number) => modificationIconMini,
                })
                this.addAsset(asset);
            }
        }

        const isCreatable = ObjectUtil.isNotEmpty(ModelConstants.MODIFICATION_PARAMS[key].createDefaultModification);
        let creatorIcon: IconModification;
        if (isCreatable) {

            creatorIcon = new IconModification('*****', key, 'create');
            creatorIcon.setHandleOpacity(creatorIcon.getLastHandleOpacity());
            const creatorThumb = this.createThumb(-1, -1, creatorIcon.getId(), true, {
                thumbCreateFunction: (index: number) => creatorIcon,
                labelFormatFunction: (index, value) => `${TimeUtil.formatCategoryDateFull(value)}`
            });
            creatorThumb.getContainer().style.opacity = '0';
            this.setCreatorThumb(creatorThumb);

            creatorThumb.getContainer().addEventListener('click', e => {

                /**
                 * get instant a click position
                 */
                const position = this.eventToPosition(e);
                const instant = this.positionToValue(position);

                /**
                 * find previous modification
                 */
                const modificationResolver = ControlsConstants.MODIFICATION_PARAMS[key].getModificationResolver();
                const copyableModification = modificationResolver.getModification(instant, 'CREATE');

                /**
                 * create new modification with copy of previous modification, but change id, name, instant
                 */
                const id = ObjectUtil.createId();
                const modificationValuesCopy: IModificationValues = {
                    ...copyableModification.getModificationValues(),
                    id,
                    name: `adjustments (${id})`,
                    instant,
                    deletable: true,
                    draggable: true,
                    primary: false
                } as IModificationValues;

                const modification = ModelConstants.MODIFICATION_PARAMS[key].createValuesModification(modificationValuesCopy);
                // console.log('modification', modification);

                /**
                 * add modification and update modification chart
                 */
                this.selectableModificationId = modification.getId(); // store id to have the modification selected once updated modifications display
                Modifications.getInstance().addModification(modification);
                StorageUtil.getInstance().setSaveRequired(true);
                this.showModifications(modification.getKey());
                ControlsConstants.MODIFICATION_PARAMS[key].handleModificationUpdate(); // update after a modification was created

            });

        }

        for (let index = 0; index < typedModifications.length; index++) {

            //  the modification icon will be picked by the thumbCreateFunction and does not have to be actively added to the slider
            const modificationIcon = new IconModification(typedModifications[index].getId(), typedModifications[index].getKey(), typedModifications[index].isDeletable() ? 'delete' : undefined);
            const modificationThumb = this.createThumb(typedModifications[index].getInstantA(), index, modificationIcon.getId(), typedModifications[index].isDraggable(), {
                thumbCreateFunction: (index: number) => modificationIcon,
                labelFormatFunction: (index, value, type) => {
                    return `${TimeUtil.formatCategoryDateDay(value)}`;
                }
            });
            this.addThumb(modificationThumb);

            const svgContainer = modificationIcon.getSvgContainer();
            let showHandleTimeout = -1;

            svgContainer.addEventListener('pointerover', e => {
                svgContainer.style.zIndex = `${IconModification.Z_INDEX++}`;
                clearTimeout(showHandleTimeout);
                showHandleTimeout = window.setTimeout(() => {
                    modificationIcon.setHandleOpacity(modificationIcon.getLastHandleOpacity());
                }, 500);
            });

            svgContainer.addEventListener('pointerout', e => {
                clearTimeout(showHandleTimeout);
                showHandleTimeout = window.setTimeout(() => {
                    modificationIcon.setHandleOpacity(0.0);
                }, 250);
            });

            // tweaking opacity of handle when hovering over
            let handleOpacityTimeout = -1;
            modificationIcon.getHandleGroupElement().addEventListener('pointerover', () => {
                clearTimeout(handleOpacityTimeout);
                modificationIcon.setHandleOpacity(0.8);
            });
            modificationIcon.getHandleGroupElement().addEventListener('pointerout', () => {
                clearTimeout(handleOpacityTimeout);
                handleOpacityTimeout = window.setTimeout(() => {
                    modificationIcon.setHandleOpacity(0.3);
                }, 25);
            });

            modificationIcon.getBulletGroupElement().addEventListener('pointerover', () => {
                clearTimeout(handleOpacityTimeout);
                modificationIcon.setHandleOpacity(0.8);
            });

            this.modificationIcons.push(modificationIcon);

            if (typedModifications[index].isDeletable()) {
                modificationIcon.getHandleGroupElement().addEventListener('click', () => {
                    Modifications.getInstance().deleteModification(modificationIcon.getId());
                    StorageUtil.getInstance().setSaveRequired(true);
                    this.selectableModificationId = this.modificationIcons[index - 1].getId(); // set previous modification as selectable -> prevent edit controls showing values of a non-existing modification
                    this.showModifications(typedModifications[index].getKey());
                    ControlsConstants.MODIFICATION_PARAMS[key].handleModificationUpdate(); // update after a modification was deleted
                });
            }

        }

        // have initial instant ready
        this.updateModificationInstants();

        if (ObjectUtil.isEmpty(this.selectableModificationId)) {

            // if there is no selectableModificationId, like there would be after a create command, try to find the closest one to the time modification
            const modificationTime = Modifications.getInstance().findModificationsByType('TIME')[0];
            const modelInstant = modificationTime.getInstantA();
            let minModificationDt = Number.MAX_SAFE_INTEGER;
            for (let index = 0; index < this.modificationIcons.length; index++) {
                const modificationDt = Math.abs(this.getValue(index) - modelInstant);
                if (modificationDt < minModificationDt) {
                    minModificationDt = modificationDt;
                    this.selectableModificationId = this.modificationIcons[index].getId();
                }
            }

        }

        const sliderThumb = this.findThumbById(this.selectableModificationId);
        if (ObjectUtil.isNotEmpty(sliderThumb)) {
            for (let index = 0; index < this.modificationIcons.length; index++) {
                if (this.modificationIcons[index].getId() === this.selectableModificationId) {
                    sliderThumb.getThumbContentContainer().focus(); // focus will auto pick the modification
                    this.selectableModificationId = null;
                }
            }
        }

    }

}

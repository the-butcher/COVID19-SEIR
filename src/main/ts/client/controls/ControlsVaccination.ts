import { IVaccinationCurve } from '../../common/modification/IVaccinationCurve';
import { ModificationVaccination } from '../../common/modification/ModificationVaccination';
import { ObjectUtil } from '../../util/ObjectUtil';
import { ChartAgeGroup } from '../chart/ChartAgeGroup';
import { IconBezierHandle } from '../gui/IconBezierHandle';
import { Controls } from './Controls';



/**
 * controller for editing vaccination modifications
 *
 * @author h.fleischer
 * @since 25.05.2021
 */
export class ControlsVaccination {

    static getInstance(): ControlsVaccination {
        if (ObjectUtil.isEmpty(this.instance)) {
            this.instance = new ControlsVaccination();
        }
        return this.instance;
    }
    private static instance: ControlsVaccination;

    private modification: ModificationVaccination;

    private ageGroup: string;
    private readonly iconBezierAP: IconBezierHandle;
    private readonly iconBezierBP: IconBezierHandle;
    private readonly iconBezierAC: IconBezierHandle;
    private readonly iconBezierBC: IconBezierHandle;
    private activeControlPointIcon: IconBezierHandle;
    // private activeMaxVaccPointIcon: IconBezierHandle;
    private bezierCanvas: HTMLCanvasElement;
    // private bezierContext: CanvasRenderingContext2D;
    // <canvas id="weibullCanvas" style="position: absolute; left: 0px; bottom: 0px; width: 100%; height: 100%" />

    constructor() {


        this.bezierCanvas = document.createElement('canvas');
        this.bezierCanvas.style.pointerEvents = 'none';
        this.bezierCanvas.style.zIndex = '100';

        document.getElementById('layoutDivRoot').appendChild(this.bezierCanvas);

        this.bezierCanvas.style.position = 'absolute';

        this.iconBezierAP = new IconBezierHandle();
        this.iconBezierBP = new IconBezierHandle();
        this.iconBezierAC = new IconBezierHandle();
        this.iconBezierBC = new IconBezierHandle();

        this.iconBezierAC.getSvgContainer().addEventListener('mousedown', e => {
            this.activeControlPointIcon = this.iconBezierAC;
        });
        this.iconBezierBC.getSvgContainer().addEventListener('mousedown', e => {
            this.activeControlPointIcon = this.iconBezierBC;
        });
        // this.iconBezierAP.getSvgContainer().addEventListener('mousedown', e => {
        //     this.activeMaxVaccPointIcon = this.iconBezierAP;
        // });
        // this.iconBezierBP.getSvgContainer().addEventListener('mousedown', e => {
        //     this.activeMaxVaccPointIcon = this.iconBezierBP;
        // });
        document.addEventListener('mousemove', e => {
            this.handlePointDrag(e);
        });
        document.addEventListener('mouseup', e => {
            this.handlePointDrop(e);
        });

    }

    handleChange(): void {
        // this is usually called when a control (a slider) updates a modification, so maybe no-op here
    }

    showVaccinationCurve(ageGroup: string): void {

        this.ageGroup = ageGroup;
        const vaccinationCurve: IVaccinationCurve = this.modification.getVaccinationCurve(ageGroup);
        this.iconBezierAP.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.pA));
        this.iconBezierAC.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.cA));
        this.iconBezierBC.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.cB));
        this.iconBezierBP.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.pB));

        this.bezierCanvas.style.left = '0px';
        this.bezierCanvas.style.top = '0px';
        this.bezierCanvas.style.width = `${window.innerWidth}px`;
        this.bezierCanvas.style.height = `${window.innerHeight}px`;
        this.bezierCanvas.style.top = '0px';
        this.bezierCanvas.style.bottom = '0px';
        // requestAnimationFrame(() => {
            this.bezierCanvas.width = window.innerWidth;
            this.bezierCanvas.height = window.innerHeight;
        // });

        console.log(this.bezierCanvas);

    }

    hideVaccinationCurve(): void {
        this.iconBezierAP.hide();
        this.iconBezierAC.hide();
        this.iconBezierBC.hide();
        this.iconBezierBP.hide();
    }

    acceptModification(modification: ModificationVaccination): void {

        Controls.acceptModification(modification);
        this.modification = modification;

        // TODO think about what the controls for vaccination, if any, might look like
        // TODO maybe a dropdown

    }

    handlePointDrag(e: MouseEvent): void {

        if (this.activeControlPointIcon) {

            const documentCoordinate = {
                x: e.clientX,
                y: e.clientY
            }
            this.activeControlPointIcon.showAt(documentCoordinate);

            if (this.activeControlPointIcon === this.iconBezierBC) {

                const documentCoordinate = {
                    x: this.iconBezierBP.getCoordinate().x,
                    y: e.clientY
                }
                this.iconBezierBP.showAt(documentCoordinate);

            }

            console.log(ChartAgeGroup.getInstance().toVaccinationCoordinate(documentCoordinate));

            this.redrawCanvas();

        }

    }

    redrawCanvas(): void {

        const bezierContext = this.bezierCanvas.getContext("2d");
        bezierContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        bezierContext.strokeStyle = '#FF0000';
        bezierContext.lineWidth = 1;

        const pA = this.iconBezierAP.getCoordinate();
        const cA = this.iconBezierAC.getCoordinate();
        const cB = this.iconBezierBC.getCoordinate();
        const pB = this.iconBezierBP.getCoordinate();

        bezierContext.beginPath();
        bezierContext.moveTo(pA.x, pA.y);
        bezierContext.lineTo(cA.x, cA.y);
        bezierContext.stroke();

        bezierContext.beginPath();
        bezierContext.moveTo(pB.x, pB.y);
        bezierContext.lineTo(cB.x, cB.y);
        bezierContext.stroke();

        bezierContext.beginPath();
        bezierContext.moveTo(pA.x, pA.y);
        bezierContext.bezierCurveTo(cA.x, cA.y, cB.x, cB.y, pB.x, pB.y);
        bezierContext.stroke();

    }

    /**
     * transforms document coordinates into chart coordinates, then store on the modification
     * @param e
     */
    handlePointDrop(e: MouseEvent): void {

        if (this.activeControlPointIcon) {

            this.activeControlPointIcon = null;

            const pA = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierAP.getCoordinate());
            const cA = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierAC.getCoordinate());
            const cB = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierBC.getCoordinate());
            const pB = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierBP.getCoordinate());
            this.modification.setVaccinationCurve(this.ageGroup, {
                pA,
                cA,
                cB,
                pB
            });

        }

    }

}
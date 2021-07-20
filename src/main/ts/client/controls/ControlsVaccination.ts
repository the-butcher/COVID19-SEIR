import { IVaccinationConfig } from '../../common/demographics/IVaccinationConfig';
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

    private readonly iconBezierAP1: IconBezierHandle;
    private readonly iconBezierAC1: IconBezierHandle;
    private readonly iconBezierBC1: IconBezierHandle;

    private readonly iconBezierAP2: IconBezierHandle;
    private readonly iconBezierAC2: IconBezierHandle;
    private readonly iconBezierBC2: IconBezierHandle;

    private readonly iconBezierBPN: IconBezierHandle;

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

        this.iconBezierAP1 = new IconBezierHandle('#FF0000');
        this.iconBezierAC1 = new IconBezierHandle('#FF0000');
        this.iconBezierBC1 = new IconBezierHandle('#FF0000');

        this.iconBezierAP2 = new IconBezierHandle('#00FF00');
        this.iconBezierAC2 = new IconBezierHandle('#00FF00');
        this.iconBezierBC2 = new IconBezierHandle('#00FF00');

        this.iconBezierBPN = new IconBezierHandle('#FF0000');

        this.iconBezierAC1.getSvgContainer().addEventListener('mousedown', e => {
            this.activeControlPointIcon = this.iconBezierAC1;
        });
        this.iconBezierAC2.getSvgContainer().addEventListener('mousedown', e => {
            this.activeControlPointIcon = this.iconBezierAC2;
        });
        this.iconBezierBC1.getSvgContainer().addEventListener('mousedown', e => {
            this.activeControlPointIcon = this.iconBezierBC1;
        });
        this.iconBezierBC2.getSvgContainer().addEventListener('mousedown', e => {
            this.activeControlPointIcon = this.iconBezierBC2;
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

        // return;

        this.ageGroup = ageGroup;
        const vaccinationCurve: IVaccinationConfig = this.modification.getVaccinationConfig(ageGroup);

        this.iconBezierAP1.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.pA1));
        this.iconBezierAC1.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.cA1));
        this.iconBezierBC1.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.cB1));

        this.iconBezierAP2.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.pA2));
        this.iconBezierAC2.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.cA2));
        this.iconBezierBC2.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.cB2));

        this.iconBezierBPN.showAt(ChartAgeGroup.getInstance().toDocumentCoordinate(vaccinationCurve.pBN));

        this.bezierCanvas.style.left = '0px';
        this.bezierCanvas.style.top = '0px';
        this.bezierCanvas.style.width = `${window.innerWidth}px`;
        this.bezierCanvas.style.height = `${window.innerHeight}px`;
        this.bezierCanvas.style.top = '0px';
        this.bezierCanvas.style.bottom = '0px';
        this.bezierCanvas.width = window.innerWidth;
        this.bezierCanvas.height = window.innerHeight;

        this.redrawCanvas();

    }

    hideVaccinationCurve(): void {

        this.iconBezierAP1.hide();
        this.iconBezierAC1.hide();
        this.iconBezierBC1.hide();
        this.iconBezierAP2.hide();
        this.iconBezierAC2.hide();
        this.iconBezierBC2.hide();
        this.iconBezierBPN.hide();

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

            // restrict control point B2.y to the same value that B1.y has
            if (this.activeControlPointIcon === this.iconBezierBC2) {
                documentCoordinate.y = this.iconBezierBPN.getCoordinate().y;
            }

            // prevent negative slope at A
            if (this.activeControlPointIcon === this.iconBezierAC1) {
                documentCoordinate.y = Math.min(e.clientY, this.iconBezierAP1.getCoordinate().y);
            }
            if (this.activeControlPointIcon === this.iconBezierAC2) {
                documentCoordinate.y = Math.min(e.clientY, this.iconBezierAP2.getCoordinate().y);
            }

            this.activeControlPointIcon.showAt(documentCoordinate);

            // move the b-coordinate along with the b-control point
            if (this.activeControlPointIcon === this.iconBezierBC1) {

                const docCoordBPN = {
                    x: this.iconBezierBPN.getCoordinate().x,
                    y: e.clientY
                };
                this.iconBezierBPN.showAt(docCoordBPN);

                const docCoordBC2 = {
                    x: this.iconBezierBC2.getCoordinate().x,
                    y: e.clientY
                };
                this.iconBezierBC2.showAt(docCoordBC2);

            }

            // console.log(ChartAgeGroup.getInstance().toVaccinationCoordinate(documentCoordinate));

            this.redrawCanvas();

        }

    }

    redrawCanvas(): void {

        const bezierContext = this.bezierCanvas.getContext("2d");
        bezierContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        bezierContext.lineWidth = 1;

        const pA1 = this.iconBezierAP1.getCoordinate();
        const cA1 = this.iconBezierAC1.getCoordinate();
        const cB1 = this.iconBezierBC1.getCoordinate();

        const pA2 = this.iconBezierAP2.getCoordinate();
        const cA2 = this.iconBezierAC2.getCoordinate();
        const cB2 = this.iconBezierBC2.getCoordinate();

        const pBN = this.iconBezierBPN.getCoordinate();

        bezierContext.strokeStyle = '#FF0000';

        bezierContext.beginPath();
        bezierContext.moveTo(pA1.x, pA1.y);
        bezierContext.lineTo(cA1.x, cA1.y);
        bezierContext.stroke();

        bezierContext.beginPath();
        bezierContext.moveTo(pBN.x, pBN.y);
        bezierContext.lineTo(cB1.x, cB1.y);
        bezierContext.stroke();

        bezierContext.beginPath();
        bezierContext.moveTo(pA1.x, pA1.y);
        bezierContext.bezierCurveTo(cA1.x, cA1.y, cB1.x, cB1.y, pBN.x, pBN.y);
        bezierContext.stroke();

        bezierContext.strokeStyle = '#00FF00';

        bezierContext.beginPath();
        bezierContext.moveTo(pA2.x, pA2.y);
        bezierContext.lineTo(cA2.x, cA2.y);
        bezierContext.stroke();

        bezierContext.beginPath();
        bezierContext.moveTo(pBN.x, pBN.y);
        bezierContext.lineTo(cB2.x, cB2.y);
        bezierContext.stroke();

        bezierContext.beginPath();
        bezierContext.moveTo(pA2.x, pA2.y);
        bezierContext.bezierCurveTo(cA2.x, cA2.y, cB2.x, cB2.y, pBN.x, pBN.y);
        bezierContext.stroke();


    }

    /**
     * transforms document coordinates into chart coordinates, then store on the modification
     * @param e
     */
    handlePointDrop(e: MouseEvent): void {

        if (this.activeControlPointIcon) {

            this.activeControlPointIcon = null;

            const pA1 = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierAP1.getCoordinate());
            const cA1 = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierAC1.getCoordinate());
            const cB1 = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierBC1.getCoordinate());

            const pA2 = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierAP2.getCoordinate());
            const cA2 = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierAC2.getCoordinate());
            const cB2 = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierBC2.getCoordinate());

            const pBN = ChartAgeGroup.getInstance().toVaccinationCoordinate(this.iconBezierBPN.getCoordinate());

            const sD = this.modification.getVaccinationConfig(this.ageGroup).sD;
            const sC = this.modification.getVaccinationConfig(this.ageGroup).sC;

            this.modification.setVaccinationCurve(this.ageGroup, {
                pA1,
                cA1,
                cB1,
                pA2,
                cA2,
                cB2,
                pBN,
                sD,
                sC
            });

        }

    }

}
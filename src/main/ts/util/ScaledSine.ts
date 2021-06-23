import { ObjectUtil } from './ObjectUtil';

export class ScaledSine {

    static getNormalizedInstance(): ScaledSine {
        if (ObjectUtil.isEmpty(this.normalizedInstance)) {
            this.normalizedInstance = new ScaledSine(Math.PI * -0.5, 1, Math.PI, 0.5);
        }
        return this.normalizedInstance;
    }

    private static normalizedInstance: ScaledSine;

    private readonly offsetX: number;
    private readonly offsetY: number;
    private readonly scaleX: number;
    private readonly scaleY: number;

    constructor(offsetX: number, offsetY: number, scaleX: number, scaleY: number) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
    }

    getY(x: number): number {
        return (Math.sin(x * this.scaleX + this.offsetX) + this.offsetY) * this.scaleY;
    }

    getX(y: number): number {
        // y = (Math.sin(x * this.scaleX + this.offsetX) + this.offsetY) * this.scaleY;
        // y / this.scaleY = Math.sin(x * this.scaleX + this.offsetX) + this.offsetY
        // y / this.scaleY - this.offsetY = Math.sin(x * this.scaleX + this.offsetX)
        // asin(y / this.scaleY - this.offsetY) = x * this.scaleX + this.offsetX
        // asin(y / this.scaleY - this.offsetY) - this.offsetX = x * this.scaleX;
        return  (Math.asin(y / this.scaleY - this.offsetY) - this.offsetX) / this.scaleX;
    }

}
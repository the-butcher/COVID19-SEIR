import { ICoordinate } from './ICoordinate';
export class CoordinateUtil {

    private constructor() {
        // no public instance
    }

    static add(coordinateA: ICoordinate, coordinateB: ICoordinate): ICoordinate {
        return {
            x: coordinateB.x + coordinateA.x,
            y: coordinateB.y + coordinateA.y
        }
    }

    static getDiff(coordinateA: ICoordinate, coordinateB: ICoordinate): ICoordinate {
        return {
            x: coordinateB.x - coordinateA.x,
            y: coordinateB.y - coordinateA.y
        }
    }

    static getLength(coordinate: ICoordinate): number {
        return Math.sqrt(coordinate.x * coordinate.x + coordinate.y * coordinate.y);
    }

    static toUnit(coordinate: ICoordinate): ICoordinate {
        const length = Math.sqrt(coordinate.x * coordinate.x + coordinate.y * coordinate.y);
        return {
            x: coordinate.x / length,
            y: coordinate.y / length,
        }
    }

    static multiply(coordinate: ICoordinate, value: number): ICoordinate {
        return {
            x: coordinate.x * value,
            y: coordinate.y * value,
        }
    }

    static getDotProduct(coordinateA: ICoordinate, coordinateB: ICoordinate): number {
        return coordinateA.x * coordinateB.x + coordinateA.y * coordinateB.y;
    }

}
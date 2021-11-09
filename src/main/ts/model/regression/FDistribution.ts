export class FDistribution {
  private readonly lookup: number[][];

  constructor() {
    this.lookup = [
      [1, 199.5],
      [2, 19.0],
      [3, 9.5521],
      [4, 6.9443],
      [5, 5.7861],
      [6, 5.1433],
      [7, 4.7374],
      [8, 4.459],
      [9, 4.2565],
      [10, 4.1028],
      [11, 3.9823],
      [12, 3.8853],
      [13, 3.8056],
      [14, 3.7389],
      [15, 3.6823],
      [16, 3.6337],
      [17, 3.5915],
      [18, 3.5546],
      [19, 3.5219],
      [20, 3.4928],
      [21, 3.4668],
      [22, 3.4434],
      [23, 3.4221],
      [24, 3.4028],
      [25, 3.3852],
      [26, 3.369],
      [27, 3.3541],
      [28, 3.3404],
      [29, 3.3277],
      [30, 3.3158],
      [40, 3.2317],
      [60, 3.1504],
      [120, 3.0718],
      [Number.MAX_SAFE_INTEGER, 2.9957],
    ];
  }

  inverseCumulativeProbability95(df2: number): number {
      if (df2 > 0) {
        for (let i=0; i<this.lookup.length; i++) {
          if (this.lookup[i][0] === df2) {
              return this.lookup[i][1];
          } else if (this.lookup[i][0] > df2) {
              // TODO interpolation
              return this.lookup[i-1][1];
          }
        }
      } else {
        return Number.MAX_VALUE;
      }

  }


}

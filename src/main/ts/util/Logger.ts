export class Logger {

    static setInstance(out: (...args: any) => void) {
        this.instance = new Logger(out);
    }

    static getInstance(): Logger {
        return this.instance;
    }
    private static instance: Logger;

    private readonly out: (...args: any) => void;

    private constructor(out: (...args: any) => void) {
        this.out = out;
    }

    log(...args: any): void {
        this.out(args);
    }

}
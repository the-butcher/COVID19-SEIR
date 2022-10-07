import { CSVParser } from "@amcharts/amcharts4/core";

/**
 * helper type that that loads json-content
 */
export class CSVLoader {

    /**
     * load from the given url and return a promise resolving to an array of data
     * @param url
     */
    async load(url: string): Promise<any[]> {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    const csvData = new CSVParser().parse(xhr.responseText);
                    resolve(csvData);
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = function () {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            };
            xhr.send();
        });
    }

}
# COVID19-SEIR
## COVID-19 SEIR Model, Age-Group granularity. Contact-Matrix based. Vaccinations, Testing, Seasonality.
![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/screenshot01.png?raw=true)
This app currently is in a pre-alpha state where various feature have to be added yet.

The code has been moved from local storage to github for backup- and documentation purposes. I plan to work on this repository to get it finished over the upcoming weeks (as of 22.05.2021).

current Tasks:
* better pre init when there is more than one strain
  * ~~accept list of modifications~~
  * ~~add some preload days~~
  * ~~iterate a minimum of preload days to a maximum of the last strain date~~
  * ~~keep a set of virtual strain modifications, each at virtual model start (begin of preload period)~~
  * ~~adapt virtual modifications until satisfactory precision is reached~~
  * re-implement proper age-group incidence setup
* rebuild contact-matrix percentage to reflect symetric values, where population has been multiplied with contact-rate
* modification chart area
  * find some primary value for strain (if possible use r<sub>t</sub>)
  * use rebuilt contact matrix percentage
  * introduce percentage for testing ratio
* validity check for when i.e. too many vaccinations have been configured in settings or initial percentage of recovered does not validate → reset to last valid state (???)
* implement import, save, export
* do performance tests on model integration and try to improve performance
  * will caching compartments on compartmentFilter improve performance
  * rather flip value fields than transforming model data
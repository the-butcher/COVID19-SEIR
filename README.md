# COVID19-SEIR
## COVID-19 SEIR Model, Age-Group granularity. Contact-Matrix based. Vaccinations, Testing, Seasonality.
![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/screenshot01.png?raw=true)
This app currently is in a pre-alpha state where various feature have to be added yet.

The code has been moved from local storage to github for backup- and documentation purposes. I plan to work on this repository to get it finished over the upcoming weeks (as of 22.05.2021).

todo:
* modification time chart diagram find max values dynamically from dataset
* explore the difference between "cases" and "total exposure" (maybe think about a solution like in model1, but may be difficult due to incidence being the central strain parameter)
* with vaccination slider on zero and pre-filled vaccinations, vaccination percentage still increases after Model.MIN_TIME
* border cases
  * all testing sliders on zero renders an all zero chart,
  * single testing slider on 1 percent leads to diagram stretching further an further
  * limit incidence range on modifications later than MIN_DATE to i.e. 10
  * validity check for when i.e. too many vaccinations have been configured in settings or initial percentage of recovered does not validate → reset to last valid state (???)
  * keep history in local storage (or internal, reset modification after validation problems)
* implement
  * import
  * save -> auto save (?), if auto save there needs to be a reset (could be done through local storage history)
  * ~~export~~
  * ~~png~~
  * csv
* testing, validity, plausibility
  * check model for having constant population (some submodels (i.e. incidence) do not count, ...)
  * find and eliminate most prominent performance bottlenecks
  * will caching compartments on compartmentFilter improve performance?
* find a way to reliably reproduce scenarios from 11.2020 and 03.2021
* move transmission-risk calculation away from worker

next:
* implement coincident indicator on modifications, then iterate when selecting -> bring lower incidence up z-wise so it can get selected
* 'deceased'
* add controls for vaccination strategy (?)
  * add sliders for priority and refusal
  * add chart showing 2 curves with priority and refusal (?)
* add immune escape to strain modification (percentage of cases that are susceptible among recovered individuals)
* zoomable chart and slider
* color-only pickers for chart-mode

done:
* ~~settings slider modification chart~~
* ~~make vacc-slider max and vacc-modification-chart max a function of max-population~~
* ~~have a second look at R(t) in the strain-modification chart~~
* ~~modification chart area~~
  * ~~find some primary value for strain (if possible use r<sub>t</sub>)~~
* ~~exposure matrix on modification~~
* ~~de-overlay strain incidence labels~~
* ~~reintroduce testing multiplier to incidence curve~~
* ~~work on proper initial incidence slope~~
* ~~calibrate strain wise~~
* ~~better range on the time modification chart line~~
* ~~effective contact matrix does not update when modification is moved by arrow key~~
* ~~proceed cursor when time modification is moved by arrow key~~
* ~~create some decent chart mode toggle~~
* ~~in 'EI' mode axis labels should be LOCALE_FORMAT_FLOAT_2 formatted~~
* ~~introduce vaccination heatmap~~
* ~~in 'SEIR' mode heatmap range should be 0 to one~~
* ~~modification chart timeline has no values for contact~~
* ~~create little colored markers where modifications are on the time slider~~
* ~~bind chart cursor to the 'time' modification~~
  * ~~when exiting the chart are, cursor shall be displayed to time modification instant~~
  * ~~show effective contact matrix on a per date basis (base_contact_matrix x reduction_through_testing * nrm_susceptible of the respective age group)~~
  * ~~disable chart zoom to keep slider and chart aligned~~
* ~~modification chart axis renders decimal number~~
* ~~contact matrix chart calculates 0 percentage~~
* ~~chart testing y-axis label formatting~~
* ~~coincident strain instants produce an error when updating model~~
* ~~rather flip value fields than transforming model data~~
* ~~check if incidence is evaluated on discovered cases only (doublecheck with model1)~~
* ~~sizing problem on the progress bar, flickers while approximating~~
* ~~copy previous modification when creating~~
* ~~clear editor when modification is deleted --> switch to previous modification~~
* ~~seir chart labels format to 0%~~
* ~~strain curves of deleted strains remain visible when switching to SEIR~~
  * ~~while in SEIR mode, strain incidence goes visible straight away~~
  * ~~modification chart on update~~
* ~~initial model calculation~~
* ~~split modification chart to one value per day, will provide tooltips on the curve~~
  * ~~implement some type mod-value provider, one for each modification type (bonus of that type will be i.e. seasonality value provider)~~
* ~~modification chart area~~
  * ~~use rebuilt contact matrix percentage~~
  * ~~introduce percentage for testing ratio~~
  * ~~format percentage when applicable~~
  * ~~consider extra axis width for vaccination labels, messes up widths otherwise~~
* ~~rebuild contact-matrix percentage to reflect symetric values, where population has been multiplied with contact-rate~~
* ~~vaccinations format to % in modification chart, but should not~~
* ~~strain incidence series labelling~~
* ~~better pre init when there is more than one strain~~
  * ~~accept list of modifications~~
  * ~~add some preload days~~
  * ~~iterate a minimum of preload days to a maximum of the last strain date~~
  * ~~keep a set of virtual strain modifications, each at virtual model start (begin of preload period)~~
  * ~~adapt virtual modifications until satisfactory precision is reached~~
  * ~~re-implement proper age-group incidence setup~~
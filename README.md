# COVID19-SEIR
## Age-Group granularity model. Contact-Matrix based, Vaccinations, Testing, Seasonality.

This is a private project, created in an attempt to understand the dynamics inherit to the COVID pandemic.
At the time of writing (20.06.2021) the model contains data for Austria. It should be possible to add data for other countries given the availability of age specific case and vaccination data.

Documentation will be added continuously over the next weeks.

Please feel free to contact me on Twitter <a href="https://twitter.com/FleischerHannes">@FleischerHannes</a>.

* ### Timeline

* ### Modifications
  * #### <a href="#anchor_time">Time</a>
  * #### <a href="#anchor_strain">Strain</a>
  * #### <a href="#anchor_contact">Contact</a>
  * #### <a href="#anchor_testing">Testing</a>
  * #### <a href="#anchor_vaccination">Vaccination</a>
  * #### <a href="#anchor_seasonality">Seasonality</a>
  * #### <a href="#anchor_settings">Settings</a>
* ### Actions
  * #### <a href="#anchor_action_export_png">Export to PNG</a>
  * #### <a href="#anchor_action_export_data">Export data to JSON</a>
  * #### <a href="#anchor_action_import_config">Import config from JSON</a>
  * #### <a href="#anchor_action_save_config">Save config to browser storage</a>
  * #### <a href="#anchor_action_export_config">Export config to JSON</a>

* ### Chart Mode
  * #### <a href="#anchor_action_export_png">Export to PNG</a>
  * #### <a href="#anchor_action_export_data">Export data to JSON</a>
  * #### <a href="#anchor_action_import_config">Import config from JSON</a>
  * #### <a href="#anchor_action_save_config">Save config to browser storage</a>
  * #### <a href="#anchor_action_export_config">Export config to JSON</a>

# <a name="anchor_timeline">TIMELINE</a>

An area where you can place "modifications" of different types. These modifications are used to alter the model by i.e. changing contact levels, adding new strains, definition seasonality.

* To change configuration of a modification click the modification. A configuration area of the modification will appear in the upper right area of your browser.
* To change the date of a modification drag it along the slider. Some modification are fixes to the beginning of the timeline an can not be dragged.
* To create a modification move your mouse over the timeline area. Modification types that are creatable will show a "create" thumb underneath the mouse.

![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/timeslider_create2.png?raw=true)

* To delete a modification move your mouse over the modification that you want to delete. Modifications that are deletable will display a delete button. Click the unfolded delete button to delete the modification without further notification.

![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/timeslider_delete.png?raw=true)

# Modifications

Modifications are the configuration of the model. Except "Time", each type of modification allows to alter the behaviour of the model by changing specific settings of modification.
## <a name="anchor_time">Time</a>

The "Time" modification serves to show effective settings for a given day along the time slider. Drag the time icon to a specific day to see actual contact rates given the model state at that time.

For example contact rates for a population at vaccination rate 50% contact rates may be higher for older age-groups, while a few months later in a population at 70% vaccination rate contact raters may be more focused on younger age groups.

![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/effective_contact.gif?raw=true)

## <a name="anchor_strain">Strain</a>

The strain modification defines properties of given strains. Adjustable properties for a strain are:
* R<sub>0</sub>, the base reduction number of this strain.
* Serial Interval, the mean between "generations" of infection.
* Initial incidence, the incidence a cases associated with the strain at the time where the strain modification is placed on the timeslider.

![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/modification_strain.png?raw=true)

## <a name="anchor_contact">Contact</a>

The contact modification allows to define a composite contact matrix from different settings matrices. Drag the sliders to a specific value or click the percentage of a slider, then type the desired value.

![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/modification_contact.gif?raw=true)

## <a name="anchor_testing">Testing</a>

The testing modification gives the possibility to define discovery rates for different settings. It is assumed that cases are discovered at the time of incubation.
A higher discovery rate means:
* More individuals will quarantine, reducing contact rates after incubation time.
* More individuals will know about infection, an then by design of this model consume a single vaccination dose from the available doses.

![alt text](https://github.com/the-butcher/COVID19-SEIR/blob/master/src/main/webapp/assets/modification_testing.png?raw=true)

## <a name="anchor_vaccination">Vaccination</a>
## <a name="anchor_seasonality">Seasonality</a>
## <a name="anchor_settings">Settings</a>

#### Hardcoded and to be changed to an i.e. configurable implementation<br><br><br>
* StrainApproximatorBaseData - manual increase of incidence to correct for awkward data
* Demographics corrections on the matrices
* AModification - isBlendable
#### Thoughts
* goal is to reliably identify a total share of cases found (the model needs then to make assumptions which age-group gets which share)
* positivity rate in pcr is influenced by antigen
* found / tested_antigen = positivity_rate_antigen (the actual amount of positive tests should already reflect sensitivity)
* There are different shares of PCR and Antigen Tests per province (i.e. Vienna having almost equal shares)
* no knowledge about how positive Antigen Tests reflect in subsequent PCT positivity rate

#### Issues
* ~~show age group name on correction and correction value too~~
* acceptModification is called multiple times -> check for performance and streamline
* checkpoints in the model for faster processing (could have some points where there is a calibrated set of strains and a continuable model state)
  * processing must reach back to the previous unchanged modification

* ~~proper blending of corrections in ModificationResolverContact~~
* consider corrections when calculating category ratio in ModificationContact (check if that is not the case already)
* interpolated test rate gives above min and below max
* wiki on github

#### Backlog
* y-axis modes in relative chart (max, age-group-max, manual)
* demographics for germany (check the default priority value 10000 in ModelImplVaccination)
* explore the difference between "cases" and "total exposure" (maybe think about a solution like in model1, but may be difficult due to incidence being the central strain parameter)
* can there be a general concept for an age-wise "control-curve" [incidence, recovery, ...]
* clarify parts of the model where i.e. vaccination is handled in ModelImplRoot, attempt to get everything to the most intuitive location
* "float" mode where base-data is not relevant
* add strain names to export json
* auto save (?), if auto save there needs to be a reset (could be done through local storage history)
* implement coincident indicator on modifications, then iterate when selecting -> bring lower icons up z-wise so it can get selected
* 'deceased'
* ~~add controls for vaccination strategy (?)~~
  * ~~add sliders for priority and refusal~~
  * ~~add chart showing 2 curves with priority and refusal (?)~~
* ~~add immune escape to strain modification (percentage of cases that are susceptible among recovered individuals)~~
* ~~zoomable chart and slider~~
* ~~color-only pickers for chart-mode~~
* testing, validity, plausibility
  * find and eliminate most prominent performance bottlenecks
  * will caching compartments on compartmentFilter improve performance?
  * move transmission-risk calculation away from worker (could improve performance for not running each time, but only when a strain is changed)
* keep history in local storage (or internal, reset modification after validation problems)
  * introduce simple undo/redo

#### Solved issues
* ~~hide base-data tooltip in prediction areas~~
* ~~ModificationResolverDiscovery alters the apps-time modification, TODO instantiate mod-time and set instants on that instance~~
* ~~adding a modification does not put storage in needs-save state~~
* ~~reintroduce the exposure chart view~~
  * ~~zoom-y on chart-draw, not only after zooming~~
* ~~allow floating point config on initial strain incidence~~
* ~~take care of corrections on matrices (bake them into matrices?)~~
* ~~reexposure~~
  * ~~add some strain (read about common terms to express this) ratio (maybe a secondary r0-reexposure) that can be used to determine reproduction for reexposure~~
  * ~~adapt ModelImplInfectious to hold a second compartment chain~~
  * ~~in ModelImplStrain include second chain compartment to nrm_ISums calculation~~
  * ~~let recovered (discovered or undiscovered) slowly feed back to susceptible -> exposed -> infectious -> recovered~~
  * ~~depending on strain, there will be some amount of infection in vaccinated itself~~
    * ~~should go to separate compartment chain and may be less infectious there, but still some~~
  * ~~add exposed from second loop to second compartment chain~~
  * ~~from last compartment of second chain, individuals go where? >> vaccination~~
* ~~border cases~~
  * ~~all testing sliders on zero renders an all zero chart,~~
  * ~~single testing slider on 1 percent leads to diagram stretching further an further~~
  * ~~limit incidence range on modifications later than MIN_DATE to i.e. 10~~
  * ~~validity check for when i.e. too many vaccinations have been configured in settings or initial percentage of recovered does not validate → reset to last valid state (???)~~
* ~~show contact diff view only in diff-display (for now)~~
* ~~there appears to be a clear issue with schools at zero contact level and testing rate still affecting the model, apparently some pre multiplication is missing in contact rate~~
  * ~~contact-categories are summed to a single value by age group, this may have to be split to categories, and then (or later, at the proper time), be multiplied with actual contact~~
* ~~find a way to reliably reproduce scenarios from 11.2020 and 03.2021~~
* ~~show absolute numbers in exposure / infected~~
* ~~exposure / day appears to give wrong (too high) numbers~~
* ~~exposure matrix has wrong values (all zero)~~
* ~~add control for blendable true|false and implement in modifications~~
  * ~~contact~~
  * ~~testing~~
* ~~blendable state for testing does not reflect saved value --> missing code in acceptModification ~~
* ~~model does not build after zooming in --> ModelInput had invalid values~~
* ~~have a second look at contact matrix normalization because age-groups could not be properly fit so far.~~
* ~~vaccination must not be creatable~~
* ~~age-group toggle from chart does not reflect in side-list~~
* ~~>= 85 behaves strange in initial week of model << awkward data at model start~~
* ~~auto update model after bezier control drag~~
* ~~alter style of bezier controls~~
* ~~add bezier curve when age is picked (currently only points draw at that time)~~
* ~~hide vacc control points~~
* ~~find out why a full set of vacc1 values pushes v2 far up (susceptible go into minus, model behaviour worsens)~~
  * ~~likely altered times between v1 and v2 which needs to be accounted for~~
* ~~a window resize is likely to break vacc curves~~
* ~~create a new default-config~~
* ~~further refine vaccination model (deflate the groupPriorities and move away from vacc step - sanitize and improve performance)~~
* ~~NO :: allow pA to not be at vacc1-min (should give better overlay) at model start in some age-groups --> also consider in vacc model prefill~~
* ~~with vaccination slider on zero and pre-filled vaccinations, vaccination percentage still increases after Model.MIN_TIME, try to reproduce~~
* ~~be sure that strain calibration is still functional~~
* ~~favicon, ... in published version~~
* ~~sidebar in firefox does not work well~~
* ~~proper default configuration~~
* ~~have a link to this readme~~
* ~~some modification-min-charts don't have values for last item~~
* ~~in the current vaccination model there is no share in 5-14~~
* ~~when the vaccination rate hits threshold there may be an edge~~
* ~~change chart range when a file is imported~~
* ~~strain slider range (1-10)~~
* ~~replace full vacc build with values from base-data~~
* ~~check vaccination model against real vaccination~~
  * ~~there would be enough overlap into the model to adjust vaccination parameters accordingly~~
* ~~redefine BaseData~~
  * ~~2nd shot data vaccination, could then prefill vaccination until 2nd shot data is fulfilled and start into the model with that status (initial percentage slider would then be obsolete)~~
  * ~~exposed (which is already there and used)~~
  * ~~recovered (for prefill with )~~
* ~~the disabled primary strain slider should show the value that is currently applicable~~
* ~~create some heatmap format that allows to show delta between model and reality~~
* ~~either have all strains at zero or find a way that strains can be placed on the timeline and still have correct incidence at their respective positions~~
* ~~there is a slight bend in cases in the initial model, which indicates a problem with initial compartment fill (?)~~
* ~~take care of primary incidence having the correct value (heatmap - sum(other))~~
* ~~change modification-resolver-strain to use StrainUtil~~
* ~~better integration of base-data -> have initial incidence from initial-data-item,~~
* ~~check model for having constant population (some submodels (i.e. incidence) do not count, ...)~~
* ~~modification time chart diagram find max values dynamically from dataset~~
  * ~~when changing a modification, then switching back to "time", the currently displayed value needs to be updated, currently a time-mod drag is required to force update~~
* ~~actions~~
  * ~~import~~
  * ~~save~~
  * ~~export~~
  * ~~png~~
  * ~~json~~
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
# AnyHVAC psychrometric engine

This React-free module wraps the MIT-licensed PsychroLib calculation backend. The
installed npm package is `psychrolib@1.1.1` (npm source commit
`b3ea36c46aca28287b356c4b5860a5d8b4d3389a`) and contains upstream PsychroLib
JavaScript version 2.5.0. The dependency package distributes the PsychroLib
Contributors' copyright and full MIT license in its `LICENSE.txt`; no PsychroLib
source is vendored here.

`calculatePsychrometricState` supports dry bulb plus relative humidity, wet bulb,
or dew point in IP and SI. Relative-humidity inputs and results use percent. SI
manual pressure accepts Pa (the default) or kPa; IP accepts psi. Results normalize
SI pressure to Pa and SI enthalpy to kJ/kg. Elevation inputs (ft in IP, m in SI)
use PsychroLib's standard-atmosphere function and are not current local weather
pressure. Manual actual barometric pressure overrides any supplied elevation.

PsychroLib stores its unit system globally. The wrapper sets it immediately before
the pressure/state calls, which all run synchronously without an `await`; JavaScript
request callbacks cannot interleave during that section. Application code must use
this module rather than import PsychroLib directly. Separate worker processes or
isolates have separate module instances.

The engine performs no intermediate or display rounding. Convenience conversions
for humidity ratio (grains/lb and g/kg) and Pa-to-kPa display are exported separately.
Validation and dependency failures are returned as structured errors, and raw
PsychroLib exceptions are never exposed. The module is intentionally isolated from
all UI, routes, charting, weather data, and multi-state HVAC calculations.

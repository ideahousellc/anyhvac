# Psychrometric chart geometry: Phase 2A

This renderer-independent module generates the physical geometry needed by a
future AnyHVAC psychrometric chart. All moist-air states—including saturation—
are obtained through the engineering-locked `calculatePsychrometricState()` API.
This layer contains no independent psychrometric equations or copied chart data.

Phase 2A provides the saturation boundary, 10–90% relative-humidity curves,
major dry-bulb grid lines, and major humidity-ratio grid lines. Phase 2B adds
constant wet-bulb, enthalpy, and specific-volume lines. Dew-point projection,
comfort-zone, and process-line geometry remain deferred.

Physical points use dry-bulb temperature and the engine's canonical humidity
ratio (lb/lb in IP or kg/kg in SI). Separate pure helpers transform those values
to and from normalized bottom-up coordinates. SVG screen-space Y inversion and
path construction belong to the future renderer.

Default temperature sampling is 0.5°F for IP and the equivalent 5/18°C for SI.
The same sample set is reused for saturation and every relative-humidity curve.
This begins with 3,010 engine evaluations for the default IP domain and 3,070 for
SI. A small number of counted saturation evaluations then refine horizontal-grid
intersections. Each saturation temperature is evaluated only once within a chart
generation and the resulting dataset is reused for curve and dry-bulb limits.

Pressure is explicit in every configuration: either standard-atmosphere pressure
derived by the engine from elevation, or manually supplied actual barometric
pressure. Changing it requires and produces new geometry; sea level is only the
default configuration, never a hidden calculation assumption.

Curve clipping is visualization geometry only. Sampled state points are never
clamped or treated as different thermodynamic states. When a sampled segment
crosses the configured humidity-ratio ceiling, linear segment interpolation adds
the visible boundary intersection. Horizontal grid lines use linear interpolation
for an initial saturation estimate, then engine-backed bisection selects the valid
saturated side of the bracket. The solver contains no psychrometric equation. The
configurable intersection tolerance is geometric and does not alter engine
calculations.

## Phase 2B line generation

Wet-bulb lines call the engine's dry-bulb + wet-bulb pathway at each derived-line
temperature. They begin at dry bulb equal to wet bulb when that point is inside
the configured temperature domain. Geometry is clipped against engine-calculated
saturation, zero humidity ratio, and the visible humidity-ratio ceiling. Default
wet-bulb spacing is 10°F in IP and 5°C in SI. When the backend's dry-air humidity
floor is reached, engine evaluations bracket and bisect the transition to 0.001°F
or 0.001°C, then the geometry terminates at the chart's zero-humidity boundary.

Enthalpy and specific-volume lines contain no property equations. At each sampled
dry bulb, engine states at 0%, 10%, ... 100% RH establish monotonic brackets. A
bounded secant estimate with midpoint fallback repeatedly calls the engine until
the requested native-unit property is matched. Bisection in dry-bulb space refines
saturation and zero-humidity endpoints instead of dropping the boundary sample.

Default enthalpy spacing is 5 Btu/lb dry air in IP and 10 kJ/kg dry air in SI.
Default specific-volume spacing is 0.5 ft³/lb dry air in IP and 0.05 m³/kg dry air
in SI. Interior Phase 2B samples are 1°F apart in IP and the equivalent 5/9°C
in SI; Phase 2A retains its locked 0.5°F-equivalent resolution. Explicit target
arrays may be supplied for focused geometry.

The enthalpy tolerance is 0.001 in native enthalpy units, the specific-volume
tolerance is 0.00001 in native volume units, and solvers are capped at 40
iterations. Full calculated precision is retained; these values are convergence
criteria rather than display rounding. Saturation/horizontal geometry retains its
separate `1e-10` humidity-ratio tolerance.

All line families use the chart's elevation-derived or manual pressure condition.
The generated `stateEvaluationBreakdown` reports engine calls attributable to the
locked Phase 2A geometry and each new family. Results are intentionally scoped to
single-state line geometry: labels, SVG paths, process states, comfort zones, and
other rendering or HVAC analysis remain outside Phase 2B.

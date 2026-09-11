# Psychrometric chart geometry: Phase 2A

This renderer-independent module generates the physical geometry needed by a
future AnyHVAC psychrometric chart. All moist-air states—including saturation—
are obtained through the engineering-locked `calculatePsychrometricState()` API.
This layer contains no independent psychrometric equations or copied chart data.

Phase 2A provides the saturation boundary, 10–90% relative-humidity curves,
major dry-bulb grid lines, and major humidity-ratio grid lines. Wet-bulb,
enthalpy, specific-volume, dew-point projection, comfort-zone, and process-line
geometry are intentionally deferred to Phase 2B or later.

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

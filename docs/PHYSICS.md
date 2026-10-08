# Physics model

This page defines what Cutline computes and how, so that every number in the app can be checked. The tracer and its
tests follow these definitions. If the code and this page disagree, the code is wrong.

## Scope

Cutline traces light through a headlamp in three dimensions with geometric (ray) optics, and reports the far-field
intensity distribution: candela in every direction. It checks that distribution against a regulation's test points,
zones and cut-off rules. It does not model:

| Effect | Status |
|---|---|
| Diffraction, interference, polarisation | Not modelled; Fresnel losses use the unpolarised average |
| Colour | Each ray carries a wavelength, so lenses disperse light (see [Colour](#colour)); results are photometric, with no colour coordinates |
| Diffuse scattering | Modelled only as the lens's surface texture and the outer lens's haze; dust and ageing are not modelled |
| Heat, LED droop, electronics | The LED flux you enter is the hot operating flux |
| Near-field effects | Intensities are far-field: the lamp is treated as a point seen from far away |

## Frame and units

The **lamp frame** is right-handed: **x** to the driver's right, **y** up, **z** forward along the vehicle axis. In a
test-point name, "R" means +x (right) and "U" means +y (up).

The design file stores lengths in millimetres, luminous flux in lumens and angles in degrees. Results are in candela
(cd) for intensity and lux (lx) for illuminance on the road.

## Far-field angles

A direction leaving the lamp is described by a horizontal angle **H** and a vertical angle **V**, in degrees. Cutline
uses the goniometer convention of UN R149 Annex 4 (§1.1.1–1.1.2, Figure A4-I): angles on a sphere with a **vertical
polar axis**, so H is the azimuth about the vertical and V the elevation above the horizontal plane,

```
H = atan2(dx, dz)        V = asin(dy)
```

The older screen convention (H = atan(dx/dz), V = atan(dy/dz), the angles of a point on a flat screen) differs by a few
tenths of a degree at 20–45°. The code still supports it for comparison, and a test pins the difference.

A far-field histogram collects the lumens leaving the lamp in each (H, V) bin, and counts the rays that carried them.
**Intensity** in a bin is its lumens over its solid angle. In the goniometer convention a bin [h₀, h₁] × [v₀, v₁]
subtends Ω = (h₁ − h₀)(sin v₁ − sin v₀), with h in radians; a test checks that the whole sphere adds up to 4π. Every trace fills
two grids: a wide grid (H ±60°, V ±30°, 0.5° × 0.25° bins) for zones and the road view, and a fine grid (H ±20°, V −6°
to +5°, 0.05° × 0.05° bins) around the cut-off.

**Intensity at a test point** is what a photometer of the regulation's size would read: R149 places a receiver within
a 65 mm square at least 25 m away, about 0.149° across. Cutline averages over the bins whose centres fall inside that
square: their lumens over their total solid angle.

**Statistical error.** A Monte Carlo value rests on the rays that reach the receiver, and its relative error is about
1/√n for n rays. The requirements above the cut-off are small, and the minimum for point P is 63 cd. At a few million
rays, one ray landing in the receiver already reads as tens of candela. So where fewer than 100 rays reach the
receiver, Cutline widens the averaging area until it holds 100, up to ±2° sideways and ±0.15° vertically. It widens
mostly sideways because cut-offs run across the beam. Every compliance value carries its error, and a passing value
within twice its error of the limit is reported as near the limit. More rays shrink the errors; the full trace uses
every processor core.

## Source

The LED is a flat Lambertian emitter, width × length millimetres, emitting into the hemisphere above its face with
intensity proportional to the cosine of the angle from its normal. A bare LED of flux Φ therefore gives I(0) = Φ/π on
its axis and half that at 60°; the tests check both. In both lamp types the LED faces up (+y), its width along x and
its length along the beam axis, and the **offset** moves it along the axis relative to the reflector's focus.

The flux to enter is the **hot** operating flux at the lamp's junction temperature, not a datasheet value at 25 °C.
Absolute candela decides pass and fail, so this number matters.

## Surfaces and materials

| Primitive | Use |
|---|---|
| Quadric F(p) = a·p² + b·p + c, clipped by half-spaces | Ellipsoidal and paraboloid reflectors, facets, the lens rim |
| Flat polygon | The cut-off shield, the direct-light shade, the housing roof |
| Flat annulus | The lens's flat back face, the bezel around the lens |
| Even asphere z(r) = c r² / (1 + √(1 − (1 + k) c² r²)) + a₄ r⁴ + a₆ r⁶ | The lens's front face, found by Newton's method |

| Material | Behaviour |
|---|---|
| Mirror (reflectance ρ, slope error σ) | Specular reflection about a normal perturbed by a Gaussian of σ per axis; weight × ρ |
| Dielectric (refractive index, Abbe number and absorption on each side) | Fresnel reflection or refraction chosen with probability R, with bulk absorption e^(−k·ℓ). The index depends on the ray's wavelength (see [Colour](#colour)). An optional surface texture deflects each transmitted ray by a Gaussian of σ per axis, and an optional sign-light zone turns rays passing below a height upwards |
| Opaque | Stops the ray; the surface names the ledger bucket that takes its light |

Every surface's local frame can be rotated. A rotation is given by yaw (positive turns +z towards +x, to the right),
pitch (positive turns +z downwards) and roll; the tests check the signs and that the axes stay orthonormal.

## Colour

Each ray carries a wavelength, drawn from the luminous spectrum of a cool-white phosphor LED (about 6000 K): the LED's
spectral power, a blue pump peak at 450 nm and a broad phosphor band near 560 nm, weighted by the CIE photopic
efficiency V(λ). Drawing from the luminous spectrum means every ray still carries equal lumens. The LED shape is a
model, not a measured part.

A lens's refractive index follows a Cauchy fit through the d, F and C lines:
n(λ) = n_d + (n_d − 1)/V_d · c(λ), with c(λ) = (1/λ² − 1/λ_d²) / (1/λ_F² − 1/λ_C²). It is n_d at 587.6 nm, and the F to
C difference is (n_d − 1)/V_d, the definition of the Abbe number V_d. Blue therefore focuses shorter than red, so a
projector images its shield edge with a coloured fringe, and the cut-off is never razor sharp. Results stay
photometric; Cutline does not report colour coordinates.

## Scattering

Two kinds of scattering soften a beam beyond what geometry alone gives.

- **Lens surface texture.** Projector lenses often carry a fine texture on the front face. Makers use it to set the
  cut-off's sharpness and hide colour fringes. Surface scatter has power-law wings (the ABg model of optical
  surfaces), so Cutline turns every ray leaving the textured face by an angle θ, in a random direction, with density
  ∝ (1 + θ²/a²)^−2.5 about the texture scale a; half the rays turn by less than 0.77a. The wings matter for the
  regulation: a Gaussian blur's log slope steepens without end into its tail, so the steepest fall that R149 aims by
  would drift deeper as more rays resolve the tail. Power-law wings keep it next to the edge. Without texture, a
  modelled projector's cut-off is far sharper than R149's maximum sharpness (G ≤ 0.40) allows.
- **Outer lens haze.** A share of the light passing the outer cover lens scatters by a Gaussian of the haze spread
  per axis. Haze in the ASTM D1003 sense is light turned more than 2.5°, so the default spread is wide (8°). A narrow,
  strong haze would raise glare just above the cut-off.

## Energy ledger

Every emitted lumen ends in exactly one bucket, so the buckets always add up to the LED's flux. The tests enforce this
through a full projector stack.

| Bucket | Meaning |
|---|---|
| Beam | Leaves the lamp forwards, after the outer lens's transmittance |
| Reflector absorption | 1 − ρ at each mirror reflection |
| Shield | Stopped by the projector's cut-off shield |
| Lens loss | Absorbed in the lens or stopped by its rim, or reflected by a lens surface and then lost |
| Housing | Stopped by the bezel, the direct-light shade, the roof or a mirror's back |
| Outer lens | 1 − τ of the outer cover lens |
| Backward | Left the lamp backwards |
| Trapped | More than 64 interactions; should stay near zero |

The **optical efficiency** of a lamp is beam lumens over LED lumens.

## Projector module

The LED sits at the first focus F₁ of an ellipsoidal reflector, facing up into it. The reflector is a triaxial
ellipsoid: its vertical semi-axis b and semi-major axis c along the beam fix the foci at F₁ = (0, 0, 0) and
F₂ = (0, 0, 2√(c² − b²)) — the distance between foci is an input and b follows from it — and its horizontal semi-axis
is b times a **width ratio**. A ratio of 1 is an exact ellipsoid of revolution; above 1 it spreads the beam sideways
while the vertical focusing stays exact. Only the upper half is kept, ending at a front edge.

A shield stands at F₂, and a plano-convex aspheric lens, flat face towards the shield, is placed so its back focus
lies on the shield: the back face sits at F₂ + f − t/n + defocus, where f = R/(n − 1) is the lens's focal length. The
lens forms an inverted image of the shield plane, so a point at height y above the axis at F₂ leaves at about
V = −atan(y/f). The tests check the focal length, the back focus, the collimation of a point at the focus and this
inversion.

The shield's top edge is computed from the intended far-field cut-off: at each x across the shield, the edge sits at
y = −f · tan(V_cut(H = −atan(x/f))), plus an optional edge offset. Light passing just above the edge leaves just below
the cut-off; light below the edge is stopped. An opaque bezel around the lens stops light that would leave the module
without passing through the lens.

**Why the LED offset matters.** With the chip centred on F₁, the reflector images it centred on the shield edge and the
shield cuts away half of the light. Moving the chip back so its front edge sits at F₁ lifts its image above the edge:
in the default module the beam more than doubles (from 14% to 30% of the LED's flux) with no light above the cut-off.

**Why the lens shape matters.** Spherical aberration in the lens turns the sharp shield edge into a soft cut-off and
throws light above it. A conic constant near −0.6 keeps the shield edge sharp across the aperture; the conic constant
and the fourth-order term are the levers.

**Shield curvature.** A flat shield is imaged onto a curved surface: far to the sides, its edge lands out of focus and
light leaks above the cut-off. The shield can bend towards the lens at its ends, z = d + κx², to follow the lens's
field. Cutline builds the shield from vertical strips at that depth.

**Overhead light.** R149 asks for a little light above the cut-off, for overhead signs (the S50 and S100 sums) and the
road edge (point P). Two features provide it. A **sign-light strip** along the bottom of the lens turns the light
passing through it upwards by an angle spread evenly between two limits; it copies a faint version of the whole beam
above the cut-off, so its height trades the sign points against the Zone III glare limit. A **shield window**, a slot
just below the shield edge, lets light through that the lens sends above the cut-off; it carries little light,
because the LED's image barely reaches below the edge.

## Multi-facet reflector

The LED sits near the focus of a paraboloid opening forwards, x² + y² = 4f(z + f), facing up into its upper half. The
reflector is cut into a grid of facets over its projected width and height above the LED. Each facet is the
paraboloid turned about its focus by a yaw and a pitch; turning a paraboloid about its focus turns the beam it reflects
by exactly the same angles (the tests check that a facet aimed at 10° right and 2° down lands there). A facet counts a
hit only when the hit point, seen from the front, lies in the facet's own cell, so facets tile the reflector without
gaps however they are aimed.

Each facet also curves a little extra sideways about its own centre, which smears its image across the **facet
spread** half-angle without turning it: a sideways curvature k tilts the normal by about 2k(x − x_c), so k =
tan(spread / 2) / facet width.

Facet aims follow a rule rather than being set one by one. On a passing beam every facet is pitched down so the
highest image of the chip sits under the cut-off: the chip's four corners are reflected at the facet's centre, and
the highest of those directions sets the pitch. This holds for any chip size and any offset of the chip from the
focus. On top of that:

| Rule | What it does |
|---|---|
| Fan | All columns but the kick columns fan out across ±spread. A fan concentration above 1 gathers them towards the centre, where the hot spot is |
| Kick columns | The kerb-side columns aim along the rising part of the cut-off, just past the elbow |
| Drop | Every facet sits this far below the cut-off |
| Row drop | Lower rows sit nearer the LED and form larger images; they aim lower by up to this angle, into the foreground and spread, while the top row's small images build the hot spot |
| Wing drop | Columns aimed wide aim lower in proportion, lighting the road edges close to the car |
| Sign-light strip | A thin strip at the bottom of the central columns aims above the cut-off for overhead signs |

A shade in front of the LED and a housing roof stop direct light that would leave above the cut-off.

## Road

The road view places two lamps 0.7 m either side of the car's centre line, at the design's mounting height, and
tilts the beam down by the design's aim. A passing beam is first raised so that its cut-off, aimed by the laboratory
to 0.57° down, sits on the horizon; a 1% aim then puts it back where the laboratory had it. At every point of the
road Cutline gives the illuminance on a target there facing the car, I/d², summed over both lamps. That is the
measure behind a headlamp's range: how far it lights an obstacle or a pedestrian to 1 lx or 3 lx. The road surface
itself receives far less, because the light grazes it.

## Regulation

The regulation layer lives apart from the optics: `src/core/regulation/` holds the requirements as data, each with its
paragraph in the official text, and an evaluator turns a beam into margins. Its content is described in
[REGULATION.md](REGULATION.md).

## Validation

1. **Analytic results:** the Lambertian source (I(0) = Φ/π, I(60°) = I(0)/2, all flux accounted for), screen solid
   angles against the exact formula, an ellipsoid sending every ray from one focus through the other, a paraboloid
   collimating its focus, Fresnel reflectance and total internal reflection, a plano-convex lens's focal length and
   back focus, its inverted image of an offset point, aimed facets landing where aimed, and rotations keeping their
   signs and orthogonality.
2. **Conservation and determinism:** every lumen accounted for through a full projector, and a trace split into chunks
   across workers equal to one uninterrupted trace.

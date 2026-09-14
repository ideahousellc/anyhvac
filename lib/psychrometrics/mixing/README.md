# Mixed-air solver

This module is intentionally downstream of the locked psychrometric engine. It calculates each incoming state with `calculatePsychrometricState`, converts CFM or L/s to dry-air mass flow with the returned specific volume, and conserves humidity ratio and enthalpy on that basis.

The installed audited PsychroLib inverse recovers dry bulb from mixed enthalpy and humidity ratio. The complete mixed state is then calculated through `calculatePsychrometricState`. A mixture at or above saturation returns a structured error; it is never clamped.

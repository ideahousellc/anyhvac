# LinkedIn — 002-airflow-static-pressure

## Hook

TESP is not airflow.

## Value / problem

A static-pressure reading helps describe the resistance a fan is working against
at a particular operating condition. It does not directly tell you CFM.

## Technical insight

Consider the reference's illustrative arithmetic:

- Return static: **-0.20 in. w.c.**
- Supply static: **+0.35 in. w.c.**
- TESP magnitude: **0.55 in. w.c.**

That result is a pressure relationship—not a specific airflow. A pressure reading
can support airflow evaluation only with the correct equipment data and operating
conditions. The example values demonstrate arithmetic only; they are not a normal,
recommended, acceptable, code-compliant, or design target.

## Resource connection

AnyHVAC Design Reference #02 connects static pressure, velocity, duct area,
traverses, capture-hood measurements, and responsible use of HVAC calculators.

## CTA

Open the free HVAC Airflow & Static Pressure Measurement Quick Reference:
https://www.anyhvac.net/resources/airflow-static-pressure-measurement

## Optional hashtags

#HVAC #StaticPressure #AirflowMeasurement

## Source notes

Claims and wording come from the canonical resource sections **What airflow and
static pressure tell you**, **Conceptual pressure relationship**, and **Workflow A
— Measure total external static pressure** in
`app/resources/airflow-static-pressure-measurement/page.tsx`.

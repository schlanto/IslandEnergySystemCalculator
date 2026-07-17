# Component data model

Every component is a standalone JSON document conforming to `schemas/component.schema.json` plus its role schema. Common required fields are schema version, unique ID, manufacturer, model, readable name, category, roles, description, electrical and operation objects, sources, notes, and data quality.

## Common conventions

- SI-derived units are encoded in field names: `W`, `Wh`, `V`, `A`, `Hz`, and seconds.
- Efficiencies are fractions from 0 to 1; percentages are 0 to 100.
- Unknown technical values are `null`; absent optional concepts may be omitted.
- `sources` must contain at least one URI and access date.
- IDs match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

## Role examples

- Consumer: `data/consumers/generic-refrigerator.json` demonstrates continuous/startup power and daily energy.
- Generator: `data/generators/generic-pv-module-450w.json` demonstrates PV operating and open-circuit ratings.
- Storage: `data/storage/generic-lifepo4-battery-5kwh.json` demonstrates capacity, current/power limits, and efficiency.
- Converter: `data/converters/generic-inverter-3kw.json` demonstrates typed ports, continuous/peak power, and an efficiency curve.

Schedules do not belong in component files. Exported system configurations reference immutable component IDs and keep quantity, usage mode, simulation duration/resolution, SOC limits, and visible assumptions separately.

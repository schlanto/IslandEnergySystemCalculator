# Component data model

Every physical component is stored in one separate JSON file. Files conform to `schemas/component.schema.json` and one role-specific schema.

## Roles

- `consumer`: a device that uses electrical power;
- `generator`: a solar panel, wind turbine, or other source;
- `storage`: a battery or other energy store;
- `converter`: an inverter, charge controller, or other converter.

## Essential fields

Every component contains:

- schema version and unique lowercase ID;
- manufacturer, model, and readable name;
- category and role;
- electrical and operating values;
- at least one public source;
- notes and data-quality information.

Units are included in field names:

- `PowerW`: watts;
- `CapacityWh`: watt-hours;
- `VoltageV`: volts;
- `CurrentA`: amperes;
- `DurationSeconds`: seconds.

Unknown technical values use `null` or are omitted. They must not be silently replaced with guessed values.

## User selection

User-specific settings remain separate from component data:

```json
{
  "componentId": "generic-refrigerator-90w",
  "quantity": 1,
  "enabled": true,
  "operatingPercent": 50
}
```

The browser stores this small selection locally. There are no schedules, time-resolution settings, user accounts, or server-side storage.

## Examples

- Consumer: `data/consumers/generic-refrigerator.json`
- Generator: `data/generators/generic-pv-module-450w.json`
- Storage: `data/storage/generic-lifepo4-battery-5kwh.json`
- Converter: `data/converters/generic-inverter-3kw.json`

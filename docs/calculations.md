# Calculation methodology

## Intended scope

The calculator models a deliberately simple system:

```text
generator → optional battery → inverter → consumers
```

It answers rough planning questions. It is not an electrical design or safety tool.

## Enabled components

Only components switched **ON** by the user are included. Changing a switch recalculates every answer immediately.

Quantity multiplies the component's listed values.

## Percentage control

Each component has one percentage:

- Consumer: average demand equals continuous power × percentage.
- Generator: average generation equals rated power × percentage.
- Battery: available energy and output power equal the listed values × percentage.
- Converter: available continuous and peak power equal the listed values × percentage.

The percentage is an estimate, not a measurement.

## Peak-power answer

The consumer peak is:

```text
sum of (startup power, or continuous power when startup is unknown) × quantity
```

The model assumes all enabled consumers can peak at the same time. This is simple and conservative.

The result compares this demand with:

- enabled inverter continuous and peak output;
- enabled battery continuous output, when a battery is present;
- enabled generator rated output when no battery is present;
- battery nominal voltage and inverter input-voltage range.

Missing values produce an unknown result. Passing these comparisons does not prove real compatibility.
For a battery-free system, the generator comparison only checks power and assumes that suitable conversion and control equipment exists.

## Runtime without generation

Runtime always assumes:

- the battery starts full;
- there is no generation at all;
- average consumer demand remains constant;
- enabled inverter and battery efficiencies remain constant.

The estimate is:

```text
available battery energy × battery efficiency
------------------------------------------------
average consumer power ÷ inverter efficiency
```

If efficiency is missing, the calculation uses 100% and displays that optimistic assumption.

## Average power balance

```text
average generation − average consumer demand
```

A positive result is a surplus; a negative result is a deficit. This balance does not model weather, time of day, charging limits, or changing battery state.

## Not checked

The calculator does not fully check cables, fuses, earthing, short circuits, cooling, temperature, communications, BMS compatibility, firmware, standards, laws, permits, phase balance, real startup curves, site weather, or installation requirements.

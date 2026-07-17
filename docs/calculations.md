# Calculation methodology

## Scope and topology

Version 0.1 models a single DC storage bus with generator → charge controller → battery → inverter → load. Components may be selected freely, but arbitrary wiring, series/parallel string design, cable losses, phase balance, temperature, and ageing are not yet modelled.

## Static compatibility

Continuous load is the sum of active consumer rated powers multiplied by quantity. Worst single-device startup load replaces one device's continuous power with its startup power; inverter continuous and peak limits are checked separately. Nominal battery voltage is checked against inverter input range, load voltage against inverter output voltage (±5%), and PV open-circuit/maximum voltage against controller limits. Missing operands produce an `unknown` result.

Battery current is `power / voltage / efficiency`. Runtime is `available usable energy × discharge efficiency / average load`. Runtime is an energy estimate, not a guarantee of peak capability.

## Time-series simulation

Each interval evaluates configured schedules, generator profiles, conversion efficiency, and net DC-bus balance. Surplus first charges the battery within charge-power, capacity, and maximum-SOC limits; the remainder is curtailed. Deficit discharges within discharge-power, available-energy, and minimum-SOC limits; the remainder is unmet load. Energy is integrated as power × interval hours.

Inverter efficiency is linearly interpolated between curve points, otherwise nominal efficiency is used. If efficiency is missing, the simulator only uses a user-supplied fallback; absent that, it visibly records the uncertain 100% treatment. SOC is clamped by the energy available to the charge/discharge equations.

## Limitations

The solar profile is an idealized daylight sine curve; wind/other production uses a user capacity factor. Startup events are statically checked but not synthesized into the time series. Multiple batteries are aggregated; converter routing is predefined. Results are planning guidance, not electrical design approval.

import { useState } from 'react'
import { calculateSimpleSystem } from './calculation/core'
import { catalog } from './data/catalog'
import type { Category, Component, SelectedComponent } from './models/types'

const STORAGE_KEY = 'simple-energy-system-v2'
const categories: { value: 'all' | Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'consumer', label: 'Consumers' },
  { value: 'generator', label: 'Generators' },
  { value: 'storage', label: 'Batteries' },
  { value: 'converter', label: 'Inverters & controllers' },
]

function repositoryName() {
  const configured = import.meta.env.VITE_GITHUB_REPOSITORY as
    string | undefined
  if (configured) return configured
  if (location.hostname.endsWith('.github.io')) {
    return `${location.hostname.split('.')[0]}/${location.pathname.split('/').filter(Boolean)[0] ?? 'IslandEnergySystemCalculator'}`
  }
  return ''
}

function initialSelection(): SelectedComponent[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const value = JSON.parse(saved) as SelectedComponent[]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function powerLabel(component: Component) {
  if (component.roles.includes('storage')) {
    const capacity =
      component.electrical.usableCapacityWh ??
      component.electrical.nominalCapacityWh
    return capacity == null ? 'Capacity unknown' : `${capacity} Wh usable`
  }
  const power =
    component.electrical.ratedPowerW ??
    component.electrical.output?.continuousPowerW ??
    component.electrical.continuousPowerW
  return power == null ? 'Power unknown' : `${power} W`
}

function percentageLabel(component: Component) {
  if (component.roles.includes('consumer')) return 'Average power used'
  if (component.roles.includes('generator')) return 'Average power generated'
  if (component.roles.includes('storage'))
    return 'Available battery capacity and power'
  return 'Available rated power'
}

function defaultPercentage(component: Component) {
  if (
    component.roles.includes('consumer') ||
    component.roles.includes('generator')
  )
    return 50
  return 100
}

function App() {
  const [selected, setSelectedState] =
    useState<SelectedComponent[]>(initialSelection)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | Category>('all')
  const repository = repositoryName()
  const repositoryUrl = repository ? `https://github.com/${repository}` : '#'

  const setSelected = (next: SelectedComponent[]) => {
    setSelectedState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const items = selected.flatMap((entry) => {
    const component = catalog.find(
      (candidate) => candidate.id === entry.componentId,
    )
    return component ? [{ component, selected: entry }] : []
  })
  const result = calculateSimpleSystem(items)

  const filtered = catalog.filter(
    (component) =>
      (category === 'all' || component.category === category) &&
      `${component.name} ${component.manufacturer} ${component.model}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )

  const addComponent = (component: Component) => {
    const existing = selected.find(
      (entry) => entry.componentId === component.id,
    )
    if (existing) {
      setSelected(
        selected.map((entry) =>
          entry.instanceId === existing.instanceId
            ? { ...entry, quantity: entry.quantity + 1, enabled: true }
            : entry,
        ),
      )
      return
    }
    setSelected([
      ...selected,
      {
        instanceId: crypto.randomUUID(),
        componentId: component.id,
        quantity: 1,
        enabled: true,
        operatingPercent: defaultPercentage(component),
      },
    ])
  }

  const updateComponent = (
    instanceId: string,
    patch: Partial<SelectedComponent>,
  ) =>
    setSelected(
      selected.map((entry) =>
        entry.instanceId === instanceId ? { ...entry, ...patch } : entry,
      ),
    )

  const removeComponent = (instanceId: string) =>
    setSelected(selected.filter((entry) => entry.instanceId !== instanceId))

  return (
    <div className="site">
      <header className="topbar">
        <a className="project-name" href="#top">
          Community Energy Calculator
        </a>
        <nav>
          <a href="#calculator">Calculator</a>
          <a href="#answers">Answers</a>
          <a href="#help">Help</a>
          {repository && (
            <a href={repositoryUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          )}
        </nav>
      </header>

      <main id="top">
        <section className="disclaimer" role="alert">
          <div>
            <strong>Rough planning aid only — check everything yourself</strong>
            <p>
              This community tool only compares a few power, energy, current,
              and voltage values. It can be incomplete, wrong, or broken. A
              positive result does not prove that components are safe or
              compatible. Check the original manuals and ask a qualified
              professional before buying, connecting, or operating equipment.
            </p>
          </div>
        </section>

        <section className="intro">
          <p className="kicker">A small open community project</p>
          <h1>Can this battery system run my devices?</h1>
          <p>
            Add your consumers, inverter, battery, and generators. Switch them
            on or off and choose a simple average percentage. The calculator
            answers three basic questions without complex settings.
          </p>
          <div className="intro-questions">
            <span>1. Is peak power sufficient?</span>
            <span>2. How long will a full battery last?</span>
            <span>3. What changes when I switch something off?</span>
          </div>
        </section>

        <section id="calculator" className="calculator">
          <div className="section-title">
            <div>
              <p>Step 1</p>
              <h2>Choose components</h2>
            </div>
            <a
              className="suggest-button"
              href={
                repository
                  ? `${repositoryUrl}/issues/new?template=add-component.yml`
                  : '#community'
              }
              target={repository ? '_blank' : undefined}
              rel={repository ? 'noreferrer' : undefined}
            >
              + Suggest a new component
            </a>
          </div>

          <div className="calculator-grid">
            <div className="library box">
              <label className="search">
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="For example: refrigerator"
                />
              </label>
              <div className="filters">
                {categories.map((item) => (
                  <button
                    key={item.value}
                    className={category === item.value ? 'active' : ''}
                    onClick={() => setCategory(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="library-list">
                {filtered.map((component) => (
                  <article className="library-item" key={component.id}>
                    <div>
                      <span className={`role ${component.category}`}>
                        {component.category}
                      </span>
                      <h3>{component.name}</h3>
                      <p>
                        {component.manufacturer} · {component.model}
                      </p>
                      <strong>{powerLabel(component)}</strong>
                    </div>
                    <button
                      className="add-button"
                      onClick={() => addComponent(component)}
                    >
                      Add
                    </button>
                    <details>
                      <summary>Data source and notes</summary>
                      <p>{component.description}</p>
                      {component.sources.map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.title}
                        </a>
                      ))}
                      {component.notes.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </details>
                  </article>
                ))}
              </div>
            </div>

            <div className="system box">
              <div className="system-heading">
                <div>
                  <p>Step 2</p>
                  <h2>Switch and adjust</h2>
                </div>
                {selected.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => setSelected([])}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="empty-state">
                  <strong>No components added</strong>
                  <p>Add components from the list on the left.</p>
                </div>
              ) : (
                <div className="selected-list">
                  {items.map(({ component, selected: entry }) => (
                    <article
                      className={`selected-item ${entry.enabled ? '' : 'disabled'}`}
                      key={entry.instanceId}
                    >
                      <div className="selected-top">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={(event) =>
                              updateComponent(entry.instanceId, {
                                enabled: event.target.checked,
                              })
                            }
                          />
                          <span>{entry.enabled ? 'ON' : 'OFF'}</span>
                        </label>
                        <div className="selected-name">
                          <strong>{component.name}</strong>
                          <small>{powerLabel(component)}</small>
                        </div>
                        <label className="quantity">
                          Qty
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={entry.quantity}
                            onChange={(event) =>
                              updateComponent(entry.instanceId, {
                                quantity: Math.max(
                                  1,
                                  Number(event.target.value),
                                ),
                              })
                            }
                          />
                        </label>
                        <button
                          className="remove-button"
                          onClick={() => removeComponent(entry.instanceId)}
                          aria-label={`Remove ${component.name}`}
                        >
                          Remove
                        </button>
                      </div>

                      <label className="percentage">
                        <span>
                          {percentageLabel(component)}
                          <button
                            className="help-dot"
                            title={
                              component.roles.includes('storage')
                                ? '100% uses all listed usable battery capacity and power. A lower value keeps a reserve.'
                                : 'Estimated average as a percentage of the listed maximum or rated value.'
                            }
                            type="button"
                          >
                            ?
                          </button>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={entry.operatingPercent}
                          onChange={(event) =>
                            updateComponent(entry.instanceId, {
                              operatingPercent: Number(event.target.value),
                            })
                          }
                        />
                        <output>{entry.operatingPercent}%</output>
                      </label>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="answers" className="answers">
          <div className="section-title">
            <p>Step 3</p>
            <h2>Your three answers</h2>
          </div>

          <div className="answer-grid">
            <article className={`answer-card ${result.canRunPeak}`}>
              <span className="answer-number">1</span>
              <p>Can the system run the enabled consumers?</p>
              <h3>
                {result.canRunPeak === 'yes'
                  ? 'Probably yes'
                  : result.canRunPeak === 'no'
                    ? 'Probably not'
                    : 'Not enough information'}
              </h3>
              <strong>{result.peakAnswer}</strong>
              <dl>
                <div>
                  <dt>Continuous consumer power</dt>
                  <dd>{Math.round(result.continuousDemandW)} W</dd>
                </div>
                <div>
                  <dt>Conservative peak power</dt>
                  <dd>{Math.round(result.peakDemandW)} W</dd>
                </div>
              </dl>
            </article>

            <article className="answer-card runtime">
              <span className="answer-number">2</span>
              <p>How long with no generation and a full battery?</p>
              <h3>
                {result.runtimeHours == null
                  ? 'Unknown'
                  : `${result.runtimeHours.toFixed(1)} hours`}
              </h3>
              <strong>{result.runtimeAnswer}</strong>
              <dl>
                <div>
                  <dt>Average consumer power</dt>
                  <dd>{Math.round(result.averageDemandW)} W</dd>
                </div>
                <div>
                  <dt>Available battery energy</dt>
                  <dd>{Math.round(result.usableBatteryWh)} Wh</dd>
                </div>
              </dl>
            </article>

            <article
              className={`answer-card balance ${result.generationBalanceW >= 0 ? 'yes' : 'no'}`}
            >
              <span className="answer-number">3</span>
              <p>What is the average power balance right now?</p>
              <h3>
                {result.generationBalanceW >= 0 ? 'Surplus' : 'Deficit'}{' '}
                {Math.abs(Math.round(result.generationBalanceW))} W
              </h3>
              <strong>
                Switch any component on or off above. This answer updates
                immediately.
              </strong>
              <dl>
                <div>
                  <dt>Average generation</dt>
                  <dd>{Math.round(result.averageGenerationW)} W</dd>
                </div>
                <div>
                  <dt>Average demand</dt>
                  <dd>{Math.round(result.averageDemandW)} W</dd>
                </div>
              </dl>
            </article>
          </div>

          <div className="checks box">
            <h3>Basic checks</h3>
            {result.checks.map((check, index) => (
              <div
                className={`check-row ${check.status}`}
                key={`${check.title}-${index}`}
              >
                <span>
                  {check.status === 'yes'
                    ? 'OK'
                    : check.status === 'no'
                      ? 'NO'
                      : '?'}
                </span>
                <div>
                  <strong>{check.title}</strong>
                  <p>{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="help" className="help">
          <div className="section-title">
            <p>Help</p>
            <h2>How to understand this tool</h2>
          </div>
          <div className="help-grid">
            <article>
              <h3>Power and energy are different</h3>
              <p>
                Watts (W) describe power at one moment. Watt-hours (Wh) describe
                how much energy is used over time. A 100 W device running for 5
                hours uses about 500 Wh.
              </p>
            </article>
            <article>
              <h3>Peak power is deliberately simple</h3>
              <p>
                The calculator assumes all enabled consumers may reach their
                listed startup or peak power together. Real systems can behave
                differently, but this simple assumption is easier to understand
                and is intentionally cautious.
              </p>
            </article>
            <article>
              <h3>The percentage is an estimate</h3>
              <p>
                A consumer at 50% is treated as using half its continuous power
                on average. A generator at 50% supplies half its rated power on
                average. Battery percentage controls how much usable capacity is
                available.
              </p>
            </article>
            <article>
              <h3>Always verify the result</h3>
              <p>
                This tool does not check cables, fuses, earthing, temperature,
                standards, communication, BMS compatibility, or every voltage
                and current limit. Ask a qualified professional before building
                a system.
              </p>
            </article>
          </div>

          <details className="assumptions">
            <summary>Show all calculation assumptions</summary>
            <ul>
              {result.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        </section>

        <section id="community" className="community">
          <p className="kicker">Built by the community</p>
          <h2>Help improve the component data</h2>
          <p>
            Found a missing device or incorrect value? Submit a public source
            and leave unknown values empty. Every contribution must be reviewed
            by a person before it is merged.
          </p>
          {repository ? (
            <div>
              <a
                className="primary-link"
                href={`${repositoryUrl}/issues/new?template=add-component.yml`}
                target="_blank"
                rel="noreferrer"
              >
                Suggest a component
              </a>
              <a href={repositoryUrl} target="_blank" rel="noreferrer">
                View source code
              </a>
            </div>
          ) : (
            <p>
              Repository links become active when
              <code> VITE_GITHUB_REPOSITORY </code> is configured.
            </p>
          )}
        </section>
      </main>

      <footer>
        Community Energy Calculator · No accounts · No tracking · Data stays in
        your browser
      </footer>
    </div>
  )
}

export default App

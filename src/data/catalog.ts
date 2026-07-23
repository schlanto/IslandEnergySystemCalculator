import type { Component } from '../models/types'

const modules = import.meta.glob('../../data/**/*.json', {
  eager: true,
  import: 'default',
})
export const catalog = Object.values(modules) as Component[]
export const componentById = (id: string) =>
  catalog.find((component) => component.id === id)

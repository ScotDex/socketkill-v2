import { writable } from 'svelte/store'

export const killCount = writable(0)
export const playerCount = writable(0)
export const iskDestroyed = writable(0)
export const connectionStatus = writable('connecting') // 'connecting' | 'online' | 'offline'
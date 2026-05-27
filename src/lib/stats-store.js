import { writable } from 'svelte/store'

export const killCount = writable(0)
export const playerCount = writable(0)
export const iskDestroyed = writable(0)
export const connectionStatus = writable('connecting')

export const serverStatus = writable({
    count: 0,
    version: 'UNKNOWN',
    vip: false,
    active: false,
});
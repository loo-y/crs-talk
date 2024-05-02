import { createStore } from 'zustand/vanilla'

type MainState = {
    count: number
}

type MainActions = {
    decrementCount: () => void
    incrementCount: () => void
}

export type MainStore = MainState & MainActions

export const initMainStore = (): MainState => {
    return { count: new Date().getFullYear() }
}

const defaultInitState: MainState = {
    count: 0,
}

export const createMainStore = (initState: MainState = defaultInitState) => {
    return createStore<MainStore>()(set => ({
        ...initState,
        decrementCount: () => set(state => ({ count: state.count - 1 })),
        incrementCount: () => set(state => ({ count: state.count + 1 })),
    }))
}

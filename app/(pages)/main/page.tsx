'use client'
import { useMainStore } from './providers'
import { MainStoreProvider } from './providers'
const Main = () => {
    const { count, incrementCount, decrementCount } = useMainStore(state => state)

    return (
        <div>
            Count: {count}
            <hr />
            <button type="button" onClick={() => void incrementCount()}>
                Increment Count
            </button>
            <button type="button" onClick={() => void decrementCount()}>
                Decrement Count
            </button>
        </div>
    )
}

const MainPage = () => {
    return (
        <MainStoreProvider>
            <Main></Main>
        </MainStoreProvider>
    )
}

export default MainPage

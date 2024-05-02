'use client'
import { useMainStore } from './providers'
import { MainStoreProvider } from './providers'
import SpeechText from '@/components/SpeechText'
const Main = () => {
    const { isloading, updateIsLoading } = useMainStore(state => state)

    return (
        <div>
            <SpeechText />
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

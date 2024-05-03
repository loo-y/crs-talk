'use client'
import { useEffect } from 'react'
import { useMainStore } from './providers'
import { MainStoreProvider } from './providers'
import SpeechText from '@/components/SpeechText'
const Main = () => {
    const { isloading, updateIsLoading } = useMainStore(state => state)
    useEffect(() => {
        let vh = window.innerHeight * 0.01
        // Then we set the value in the --vh custom property to the root of the document
        document.documentElement.style.setProperty('--vh', `${vh}px`)

        // We listen to the resize event
        window.addEventListener('resize', () => {
            // We execute the same script as before
            let vh = Math.min(document?.documentElement?.clientHeight || window.innerHeight, window.innerHeight) * 0.01
            console.log(`resizing, new view height`, vh)
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        })
    }, [])

    return (
        <div className="">
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

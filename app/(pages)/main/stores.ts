import { createStore } from 'zustand/vanilla'
import type { SpeechToken } from '@/shared/interface'

type MainState = {
    isloading?: boolean
    isRecording?: boolean
    isAssistantSpeaking?: boolean
    speechToken?: SpeechToken
}

type MainActions = {
    updateIsLoading: (loading: boolean) => void
    updateIsRecording: (recording: boolean) => void
    updateIsAssistantSpeaking: (speaking: boolean) => void
    updateSpeechToken: (token: SpeechToken) => void
}

export type MainStore = MainState & MainActions

export const initMainStore = (): MainState => {
    return { isloading: false }
}

const defaultInitState: MainState = {}

export const createMainStore = (initState: MainState = defaultInitState) => {
    return createStore<MainStore>()(set => {
        return {
            ...initState,
            updateIsLoading: (loading: boolean) =>
                set(state => {
                    return {
                        isloading: loading,
                    }
                }),
            updateIsRecording: (recording: boolean) =>
                set(state => {
                    return {
                        isRecording: recording,
                    }
                }),
            updateIsAssistantSpeaking: (speaking: boolean) =>
                set(state => {
                    return {
                        isAssistantSpeaking: speaking,
                    }
                }),
            updateSpeechToken: (token: SpeechToken) =>
                set(state => {
                    return {
                        speechToken: token,
                    }
                }),
        }
    })
}

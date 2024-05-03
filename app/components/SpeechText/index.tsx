'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useMainStore } from '@/(pages)/main/providers'
import { fetchTokenOrRefresh } from '@/shared/Fetches'
import type { SpeechToken } from '@/shared/interface'
import { recordingIdleGap } from '@/shared/constants'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'

let recordOffset = 0
export default function SpeechText({}: {}) {
    const { speechToken, isRecording, updateIsRecording, updateSpeechToken } = useMainStore(state => state)
    const [recordedTextList, setRecordedTextList] = useState<{ offset: string; text: string }[]>([])
    const [stateRecognizer, setStateRecognizer] = useState<Record<string, any>>()

    let recordingIdleTimer: any = null
    const handleRecording = (speechRecognitionResult: Record<string, any>) => {
        console.log('SpeechRecognitionResult', speechRecognitionResult)
        const { privText, privOffset, text, offset } = speechRecognitionResult || {}
        if (privText || text) {
            setRecordedTextList(recordedTextList => {
                const indexCurrent = _.findIndex(recordedTextList, { offset: privOffset || offset })
                if (indexCurrent > -1) {
                    recordedTextList[indexCurrent].text = privText || text
                    return [...recordedTextList]
                } else {
                    return [...recordedTextList, { offset: privOffset || offset, text: privText || text }]
                }
            })
        }

        clearTimeout(recordingIdleTimer)
        recordingIdleTimer = setTimeout(() => {
            updateIsRecording(false)
        }, recordingIdleGap)
    }

    useEffect(() => {
        if (!speechToken) {
            const syncSpeechToken = async () => {
                const { authToken, region } = await helperGetSpeechTokenAsync()
                if (authToken && region) {
                    updateSpeechToken({
                        authToken,
                        region,
                    })
                }
            }
            console.log(`speechToken`, speechToken)
            syncSpeechToken()
        }
    }, [])

    useEffect(() => {
        if (isRecording) {
            if (!speechToken) {
                const syncSpeechToken = async () => {
                    const { authToken, region } = await helperGetSpeechTokenAsync()
                    if (authToken && region) {
                        updateSpeechToken({ authToken, region })
                        helperSttFromMic(
                            stateRecognizer,
                            { authToken, region },
                            handleRecording,
                            (recognizer: Record<string, any>) => {
                                if (recognizer) {
                                    setStateRecognizer(recognizer)
                                }
                            }
                        )
                    }
                }
                // console.log(`speechToken`, speechToken)
                syncSpeechToken()
            } else {
                helperSttFromMic(
                    stateRecognizer,
                    speechToken || {},
                    handleRecording,
                    (recognizer: Record<string, any>) => {
                        if (recognizer) {
                            setStateRecognizer(recognizer)
                        }
                    }
                )
            }
        } else if (stateRecognizer) {
            helperPauseMic(stateRecognizer)
        }
    }, [isRecording])

    return (
        <div className="w-96 flex flex-col">
            <div className="flex talkCircle flex-col gap-2">
                {_.map(recordedTextList, (recordItem, recordIndex) => {
                    return (
                        <div key={`record-${recordIndex}`} className="flex">
                            {recordItem?.text || ''}
                        </div>
                    )
                })}
            </div>
            <div className="flex functional flex-row justify-between items-center">
                <div
                    className="flex pause w-5 h-5 bg-slate-800 cursor-pointer rounded-full"
                    onClick={() => updateIsRecording(true)}
                ></div>
                <div
                    className="flex stop w-5 h-5 bg-red-800 cursor-pointer rounded-full"
                    onClick={() => updateIsRecording(false)}
                ></div>
            </div>
        </div>
    )
}

const helperGetSpeechTokenAsync = async (): Promise<{ authToken?: string; region?: string }> => {
    const response = await fetchTokenOrRefresh()
    const { status, authToken, region } = response || {}
    if (status) {
        return {
            authToken,
            region,
        }
    }
    return {}
}

const helperSttFromMic = async (
    stateRecognizer: any,
    speechToken: SpeechToken,
    recording: (arg: any) => void,
    callback?: (arg?: any) => void
) => {
    if (!speechToken?.authToken || !speechToken?.region) {
        return
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(speechToken.authToken, speechToken.region)
    speechConfig.speechRecognitionLanguage = 'zh-CN'

    let recognizer
    if (!stateRecognizer) {
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
        recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
    } else {
        recognizer = stateRecognizer
        recognizer.startContinuousRecognitionAsync()
        callback && callback()
        return
    }

    recognizer.recognizing = function (s: any, e: Record<string, any>) {
        console.log('Duration in Ticks: ', e.result)
        recording(e?.result)
    }

    recognizer.startContinuousRecognitionAsync()

    if (callback) {
        callback(recognizer)
    }
}

const helperPauseMic = async (recognizer: Record<string, any>) => {
    recognizer.stopContinuousRecognitionAsync()
}

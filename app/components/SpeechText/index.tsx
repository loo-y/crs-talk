'use client'
import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useMainStore } from '@/(pages)/main/providers'
import { fetchTokenOrRefresh } from '@/shared/API'
import type { SpeechToken } from '@/utils/interface'
import { recordingIdleGap } from '@/utils/constants'
const speechsdk = require('microsoft-cognitiveservices-speech-sdk')

let recordOffset = 0
export default function SpeechText({}: {}) {
    const { speechToken, isRecording, updateIsRecording, updateSpeechToken } = useMainStore(state => state)
    const [recordedText, setRecordedText] = useState<string>('')
    const [currentRecording, setCurrentRecording] = useState<string>('')
    // const [recordOffset, setRecordOffset] = useState<number>(0)
    const [stateRecognizer, setStateRecognizer] = useState<Record<string, any>>()
    const [triggerMic, setTriggerMic] = useState(false)

    // useEffect(()=>{
    //     setRecordedText((text)=>{
    //         return `${text}\n\n${currentRecording}`
    //     })
    // }, [recordOffset])

    let recordingIdleTimer: any = null
    const handleRecording = (speechRecognitionResult: Record<string, any>) => {
        console.log('SpeechRecognitionResult', speechRecognitionResult)
        const { privText, privOffset } = speechRecognitionResult || {}
        if (privText) {
            // setRecordOffset(privOffset)
            if (!recordOffset) recordOffset = privOffset
            if (recordOffset === privOffset) {
                setCurrentRecording(privText)
            } else {
                setRecordedText(text => `${text}\n\n${privText}`)
                setCurrentRecording('')
                recordOffset = privOffset
            }

            // if(!!recordOffset && privOffset !== recordOffset){
            //     setRecordText((text)=>`${text}\n\n${privText}`)
            // }else{
            //     console.log(`recordOffset`, recordOffset, privOffset, !recordOffset)
            //     setRecordText(privText)
            // }
        }

        clearTimeout(recordingIdleTimer)
        recordingIdleTimer = setTimeout(() => {
            console.log(`recordingIdleTimer`, stateRecognizer)
            if (stateRecognizer) {
                helperPauseMic(stateRecognizer)
                setTriggerMic(false)
            }
        }, recordingIdleGap)
    }

    const handleStopMic = useCallback(() => {
        if (stateRecognizer) {
            helperPauseMic(stateRecognizer)
            setTriggerMic(false)
        }
    }, [stateRecognizer])

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
        } else {
            console.log('speechToken in MainState', speechToken)
            updateIsRecording(triggerMic)
        }
    }, [triggerMic])

    useEffect(() => {
        if (isRecording) {
            helperSttFromMic(stateRecognizer, speechToken || {}, handleRecording, (recognizer: Record<string, any>) => {
                if (recognizer) {
                    setStateRecognizer(recognizer)
                }
            })
        }
    }, [isRecording])

    return (
        <div className="w-96 flex flex-col">
            <div className="flex talkCircle">
                {recordOffset}. {recordedText}
                {currentRecording ? `\n\n${currentRecording}` : ''}
            </div>
            <div className="flex functional flex-row justify-between items-center">
                <div
                    className="flex pause w-5 h-5 bg-slate-800 cursor-pointer rounded-full"
                    onClick={() => setTriggerMic(true)}
                ></div>
                <div className="flex stop w-5 h-5 bg-red-800 cursor-pointer rounded-full" onClick={handleStopMic}></div>
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

    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(speechToken.authToken, speechToken.region)
    speechConfig.speechRecognitionLanguage = 'zh-CN'

    let recognizer
    if (!stateRecognizer) {
        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput()
        recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig)
    } else {
        recognizer = stateRecognizer
        recognizer.startContinuousRecognitionAsync()
        callback && callback()
        return
    }

    // this.setState({
    //     displayText: 'speak into your microphone...'
    // });

    recognizer.recognizing = function (s: any, e: Record<string, any>) {
        // console.log(`this is s`, s)
        // console.log(`this is e`, e)
        // console.log('RECOGNIZING: ' + e.result.text)
        // console.log('Offset in Ticks: ' + e.result.offset)
        // console.log('Duration in Ticks: ' + e.result.duration)
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

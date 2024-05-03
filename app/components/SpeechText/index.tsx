'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useMainStore } from '@/(pages)/main/providers'
import { fetchTokenOrRefresh, fetchAIGraphqlStream } from '@/shared/Fetches'
import type { SpeechToken } from '@/shared/interface'
import { recordingIdleGap } from '@/shared/constants'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'

export default function SpeechText({}: {}) {
    const { speechToken, isRecording, talkStart, updateTalkStart, updateIsRecording, updateSpeechToken } = useMainStore(
        state => state
    )
    const [recordedTextList, setRecordedTextList] = useState<{ offset: string; text: string }[]>([])
    const [stateRecognizer, setStateRecognizer] = useState<Record<string, any>>()
    const [stateTTSSpeechConfig, setStateTTSSpeechConfig] = useState<Record<string, any>>()

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
            if (talkStart) {
                let streamText = ''
                // fetch ai response
                helperGetAIResponse({
                    messages: [{ role: 'user', content: _.map(recordedTextList, 'text').join('\n') }],
                    onStream: async (responseStream: string) => {
                        const text = _.trim(responseStream)
                        console.log('onStream', responseStream, text)

                        if (text) {
                            streamText += text
                            // await helperTts(responseStream, stateSynthesizer, speechToken, (synthesizer)=>{
                            //     setStateSynthesizer(synthesizer)
                            // })
                        }
                    },
                }).then(async res => {
                    // after response completed, continue recording
                    console.log(res)
                    await helperTts(streamText, stateTTSSpeechConfig, speechToken, speechConfig => {
                        setStateTTSSpeechConfig(speechConfig)
                    })
                    updateIsRecording(true)
                })
            }
        }
    }, [isRecording])

    useEffect(() => {
        if (!talkStart) {
            updateIsRecording(false)
        } else {
            updateIsRecording(true)
        }
    }, [talkStart])

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
                    // onClick={() => updateIsRecording(true)}
                ></div>
                {talkStart ? (
                    <div
                        className="flex stop w-5 h-5 bg-red-800 cursor-pointer rounded-full"
                        onClick={() => updateTalkStart(false)}
                    ></div>
                ) : (
                    <div
                        className="flex stop w-5 h-5 bg-green-800 cursor-pointer rounded-full"
                        onClick={() => updateTalkStart(true)}
                    ></div>
                )}
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

const helperTts = async (
    inputText: string,
    stateSpeechConfig: any,
    speechToken?: SpeechToken,
    callback?: (synthesizer: any) => void
) => {
    if (!speechToken?.authToken || !speechToken?.region) {
        return
    }

    return new Promise((resolve, reject) => {
        let synthesizer: SpeechSDK.SpeechSynthesizer | undefined = undefined
        let speechConfig: SpeechSDK.SpeechConfig | undefined = undefined
        if (!stateSpeechConfig) {
            speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
                speechToken?.authToken || ``,
                speechToken?.region || ``
            )
            speechConfig.speechSynthesisLanguage = 'zh-CN'
            speechConfig.speechSynthesisVoiceName = 'zh-CN-XiaochenMultilingualNeural'
            typeof callback === 'function' && callback(speechConfig)
        } else {
            speechConfig = stateSpeechConfig
        }

        const audio = new SpeechSDK.SpeakerAudioDestination()
        audio.onAudioEnd = () => {
            console.log(`onAudioEnd`)
            resolve(true)
        }
        audio.onAudioStart = () => {
            console.log(`onAudioStart`)
        }

        if (speechConfig) {
            const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(audio)
            synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig)
            synthesizer?.speakTextAsync(
                inputText,
                function (result) {
                    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        console.log('Speech synthesized for text: ' + inputText)
                    } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
                        console.log('Error: ' + result.errorDetails)
                    }
                    window.console.log(result)
                    synthesizer?.close()
                    synthesizer = undefined
                },
                function (err) {
                    console.log(`reject`, err)
                    synthesizer?.close()
                    synthesizer = undefined
                    reject(err)
                }
            )
        }
    })
}

const helperGetAIResponse = async ({
    messages,
    onStream,
}: {
    messages: { role: string; content: string }[]
    onStream?: (arg: any) => void
}) => {
    return new Promise((resolve, reject) =>
        fetchAIGraphqlStream({
            messages,
            isStream: true,
            queryOpenAI: true,
            openAIParams: {
                baseUrl: 'http://localhost:11434/v1/',
                model: 'qwen:7b',
                apiKey: 'local request no need apiKey',
            },
            maxTokens: 100,
            streamHandler: (streamResult: { data: string; status?: boolean }) => {
                console.log('streamHandler', streamResult)
                const { data } = streamResult || {}
                try {
                    const { hasNext, incremental } = (typeof data == `object` ? data : JSON.parse(data)) || {}
                    if (incremental) {
                        _.map(incremental || [], (_incremental: { items: string[]; path: (string | Number)[] }) => {
                            const { items, path } = _incremental || {}
                            const [chat, aiType, index] = path as [string, String, Number]
                            console.log(`items`, items)
                            typeof onStream == `function` && onStream(items?.[0] || ``)
                        })
                    }
                } catch (err) {
                    console.log(`err`, err)
                    reject(err)
                }
            },
            completeHandler: value => {
                resolve(true)
            },
        })
    )
}

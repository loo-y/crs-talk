'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useMainStore } from '@/(pages)/main/providers'
import { fetchTokenOrRefresh, fetchAIGraphqlStream } from '@/shared/Fetches'
import type { SpeechToken } from '@/shared/interface'
import { recordingIdleGap } from '@/shared/constants'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import AudioVisualizer from '../AudioVisualizer'
import TextVisualizer from '../TextVisualizer'

const textAudioPlayQueue: string[] = []
let streamInQueuePlaying = false
export default function SpeechText({}: {}) {
    const { speechToken, isRecording, talkStart, updateTalkStart, updateIsRecording, updateSpeechToken } = useMainStore(
        state => state
    )
    const [talkMessageList, setTalkMessageList] = useState<
        { role: 'user' | 'assistant' | 'system'; content: string }[]
    >([
        {
            role: 'system',
            content:
                '你现在是我的朋友，我们正在饭后聊天，请用尽量简短和轻松的语气和我对话，并且请不要在对话中让人发现你是AI，不要出现emoji',
        },
    ])
    const [recordedTextList, setRecordedTextList] = useState<{ offset: string; text: string }[]>([])
    const [stateRecognizer, setStateRecognizer] = useState<Record<string, any>>()
    const [stateTTSSpeechConfig, setStateTTSSpeechConfig] = useState<Record<string, any>>()
    const [speechTokenOpenAI, setSpeechTokenOpenAI] = useState<SpeechToken>()
    const talkMessageListRef = useRef<HTMLDivElement>(null)

    let recordingIdleTimer: any = null
    const handleRecording = (speechRecognitionResult: Record<string, any>) => {
        console.log('SpeechRecognitionResult', speechRecognitionResult)
        const { privText, privOffset, text, offset } = speechRecognitionResult || {}
        const isEmptyText = _.trim(privText || text)?.length <= 0
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

        !isEmptyText && clearTimeout(recordingIdleTimer)
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
            syncSpeechToken()
        }

        // speechTokenOpenAI
        if (!speechTokenOpenAI) {
            const syncSpeechToken = async () => {
                const { authToken, region } = await helperGetSpeechTokenAsync(true)
                if (authToken && region) {
                    setSpeechTokenOpenAI({
                        authToken,
                        region,
                    })
                }
            }
            syncSpeechToken()
        }
    }, [])

    useEffect(() => {
        const talkMessageListDiv = talkMessageListRef.current as HTMLDivElement
        if (talkMessageListDiv) {
            talkMessageListDiv.scrollTo(0, talkMessageListDiv.scrollHeight)
        }
    }, [talkMessageList])

    const handlePlayAudio = async (text: string) => {
        textAudioPlayQueue.push(text)

        if (streamInQueuePlaying) {
            return
        }

        // setStreamInQueuePlaying(true)
        streamInQueuePlaying = true
        while (textAudioPlayQueue.length) {
            const textPlay = textAudioPlayQueue.shift()
            if (textPlay == `__{{streamCompleted}}__`) {
                // setStreamInQueuePlaying(false)
                streamInQueuePlaying = false
                talkStart && updateIsRecording(true)
                break
            }
            if (textPlay) {
                // console.log(`speechTokenOpenAI?.authToken`, speechTokenOpenAI, speechToken, speechTokenOpenAI?.authToken ? speechTokenOpenAI : speechToken)
                await helperTts(
                    textPlay,
                    stateTTSSpeechConfig,
                    speechTokenOpenAI?.authToken ? speechTokenOpenAI : speechToken,
                    speechConfig => {
                        setStateTTSSpeechConfig(speechConfig)
                    }
                )
            }
        }
        // setStreamInQueuePlaying(false)
        streamInQueuePlaying = false
    }

    useEffect(() => {
        if (isRecording) {
            if (!speechToken) {
                const syncSpeechToken = async () => {
                    const { authToken, region } = await helperGetSpeechTokenAsync()
                    if (authToken && region) {
                        updateSpeechToken({ authToken, region })
                        talkStart &&
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
                talkStart &&
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
                const userContent = _.map(recordedTextList, 'text').join(', ')
                const newMessageList = [...talkMessageList, { role: 'user', content: userContent }] as {
                    role: 'user' | 'assistant'
                    content: string
                }[]
                setTalkMessageList(newMessageList)
                setRecordedTextList([])
                let streamText = ''
                // fetch ai response
                helperGetAIResponse({
                    messages: newMessageList,
                    onStream: async (responseStream: string) => {
                        const text = _.trim(responseStream).replace(/\*/g, '')
                        // console.log('onStream', text)

                        if (text) {
                            if (text == `__{{streamCompleted}}__`) {
                                if (streamText) {
                                    handlePlayAudio(streamText)
                                }

                                // 用于通知结束
                                handlePlayAudio(text)
                            } else {
                                streamText += text
                                // if (['。', '!', '?', '！', '？'].includes(text.slice(-1))) {
                                //     handlePlayAudio(streamText)
                                //     streamText = ''
                                // }
                                setTalkMessageList(talkMessageList => {
                                    if (talkMessageList?.at(-1)?.role === 'assistant') {
                                        const newList = [...talkMessageList]
                                        newList!.at(-1)!.content += text
                                        return newList
                                    } else {
                                        return [...talkMessageList, { role: 'assistant', content: text }]
                                    }
                                })
                            }
                        }
                    },
                }).then(async res => {
                    // after response completed, continue recording
                    console.log(res)
                    // await helperTts(streamText, stateTTSSpeechConfig, speechToken, speechConfig => {
                    //     setStateTTSSpeechConfig(speechConfig)
                    // })
                    // setTalkMessageList(talkMessageList => [...talkMessageList, {role: "assistant", content: streamText}])
                    // talkStart && updateIsRecording(true)
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

    const textLengthRef = useRef(0)
    const [textSpeed, setTextSpeed] = useState(0)
    useEffect(() => {
        const interval = setTimeout(() => {
            const currentLength = _.map(recordedTextList, 'text').join('').length
            const diff = currentLength - textLengthRef.current
            const speed = diff * (Math.random() > 0.5 ? 15 : 20) + Math.ceil(Math.random() * 10)
            setTextSpeed(speed)
            console.log(`diff`, diff, speed)
            textLengthRef.current = currentLength
        }, 30)

        // return () => {
        //     console.log(`clear interval`)
        //     clearInterval(interval);
        // }
    }, [recordedTextList, isRecording])

    const handleTestTTS = () => {
        let streamText = ''
        helperGetAIResponse({
            messages: [...talkMessageList, { role: 'user', content: `你好呀` }],
            onStream: async (responseStream: string) => {
                const text = _.trim(responseStream).replace(/\*/g, '')
                // console.log('onStream', text)

                if (text) {
                    if (text == `__{{streamCompleted}}__`) {
                        if (streamText) {
                            handlePlayAudio(streamText)
                        }

                        // 用于通知结束
                        handlePlayAudio(text)
                    } else {
                        streamText += text
                        // if (['。', '!', '?', '！', '？'].includes(text.slice(-1))) {
                        //     handlePlayAudio(streamText)
                        //     streamText = ''
                        // }
                        setTalkMessageList(talkMessageList => {
                            if (talkMessageList?.at(-1)?.role === 'assistant') {
                                const newList = [...talkMessageList]
                                newList!.at(-1)!.content += text
                                return newList
                            } else {
                                return [...talkMessageList, { role: 'assistant', content: text }]
                            }
                        })
                    }
                }
            },
        })
    }
    return (
        <div className=" w-[20rem] flex flex-col gap-2">
            <div className="flex talkCircle flex-col gap-2">
                {/* {_.map(recordedTextList, (recordItem, recordIndex) => {
                    return (
                        <div key={`record-${recordIndex}`} className="flex">
                            {recordItem?.text || ''}
                        </div>
                    )
                })} */}
                <AudioVisualizer isMicOn={isRecording || false} />
                {/* <TextVisualizer textSpeed={textSpeed} /> */}
            </div>
            <div className="flex functional flex-row justify-between items-center">
                <div className="flex flex-row h-5 gap-2 items-center font-semibold text-sm">
                    <div className="">{talkStart ? (isRecording ? 'Recording' : 'Please Wait') : ''}</div>
                </div>
                <div className="flex flex-row h-5 gap-2 items-center font-semibold text-sm">
                    {talkStart ? (
                        <>
                            <div className="">Stop</div>
                            <div
                                className="flex stop w-5 h-5 bg-red-800 cursor-pointer rounded-full"
                                onClick={() => updateTalkStart(false)}
                            ></div>
                        </>
                    ) : (
                        <>
                            <div className="">Start</div>
                            <div
                                className="flex stop w-5 h-5 bg-green-800 cursor-pointer rounded-full"
                                onClick={() => updateTalkStart(true)}
                                // onClick={() => handleTestTTS()}
                            ></div>
                        </>
                    )}
                </div>
            </div>
            <div
                className="flex flex-col overflow-x-hidden overflow-y-scroll max-h-[12rem] h-fit px-2 gap-2"
                ref={talkMessageListRef}
            >
                {_.map(talkMessageList, (talkItem, talkIndex) => {
                    if (talkItem.role == `system`) {
                        return null
                    }
                    return (
                        <div key={`talk-${talkIndex}`} className="flex flex-row items-start text-sm">
                            <div className="flex w-16">{talkItem.role == 'assistant' ? `AI` : `用户`} :</div>
                            <div className="flex flex-1">{talkItem?.content || ''}</div>
                        </div>
                    )
                })}
                {_.isEmpty(recordedTextList) ? null : (
                    <div className="flex flex-row items-start text-sm">
                        <div className="flex w-16">{`用户`} :</div>
                        <div className="flex flex-1">{_.map(recordedTextList, 'text').join(', ') || ''}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

const helperGetSpeechTokenAsync = async (isOpenAI?: boolean): Promise<{ authToken?: string; region?: string }> => {
    const response = await fetchTokenOrRefresh(isOpenAI)
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
        alert(`Please get speech token first`)
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
        callback && callback(recognizer)
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
        alert(`no speechToken`)
        return
    }
    // alert(`speechToken.region: ${speechToken.region}`)
    console.log(`speechToken.region`, speechToken, speechToken.region)
    return new Promise((resolve, reject) => {
        let lazyResolve: any
        let synthesizer: SpeechSDK.SpeechSynthesizer | undefined = undefined
        let speechConfig: SpeechSDK.SpeechConfig | undefined = undefined
        if (!stateSpeechConfig) {
            speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
                speechToken?.authToken || ``,
                speechToken?.region || ``
            )
            // speechConfig.speechSynthesisLanguage = 'zh-CN' // 'wuu-CN' //
            speechConfig.speechSynthesisVoiceName = `zh-CN-XiaoxiaoMultilingualNeural` // `en-US-OnyxMultilingualNeural` // 'zh-CN-XiaoxiaoMultilingualNeural' // 'wuu-CN-XiaotongNeural' //

            typeof callback === 'function' && callback(speechConfig)
        } else {
            speechConfig = stateSpeechConfig
        }

        const audio = new SpeechSDK.SpeakerAudioDestination()
        audio.format = SpeechSDK.AudioStreamFormat.getWaveFormat(16000, 1, 16, SpeechSDK.AudioFormatTag.MP3)
        audio.onAudioEnd = () => {
            clearTimeout(lazyResolve)
            console.log(`onAudioEnd`)
            synthesizer?.close()
            synthesizer = undefined
            resolve(true)
        }
        audio.onAudioStart = () => {
            console.log(`onAudioStart`)
            // alert(`onAudioStart`)
        }

        if (speechConfig) {
            // const audioConfig = SpeechSDK.AudioConfig.fromStreamOutput(audio)
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput()
            synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig)
            synthesizer?.speakTextAsync(
                inputText,
                function (result) {
                    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        console.log('TTS Speech synthesized for text: ' + inputText)
                        resolve(true)
                    } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
                        alert(`error, cancel, ${result.errorDetails}`)
                        console.log('TTS Error: ' + result.errorDetails)
                        resolve(false)
                    }
                    console.log(`tts result====>`, result)
                    synthesizer?.close()
                    synthesizer = undefined

                    // lazyResolve = setTimeout(() => {
                    //     alert(`error, timeout, ${audio.isClosed}`)
                    //     audio.close()
                    //     synthesizer?.close()
                    //     synthesizer = undefined
                    //     resolve(true)
                    // }, 15 * 1000)
                },
                function (err) {
                    alert(`error, reject`)
                    console.log(`reject`, err)
                    synthesizer?.close()
                    synthesizer = undefined
                    resolve(false)
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
                baseUrl: 'https://api.deepseek.com/v1/',
                model: 'deepseek-chat',
                // model: 'qwen:7b',
                // model: "llama3",
                // model: 'phi3:3.8b-mini-instruct-4k-fp16',
                // model: 'hfl/llama-3-chinese-8b-instruct-gguf',
                // model: "microsoft/Phi-3-mini-4k-instruct-gguf",
                // apiKey: 'lm-studio',
            },
            // queryMoonshot: true,
            // queryGroq: true,
            maxTokens: 200,
            streamHandler: (streamResult: { data: string; status?: boolean }) => {
                console.log('streamHandler', streamResult)
                const { data } = streamResult || {}
                try {
                    const { hasNext, incremental } = (typeof data == `object` ? data : JSON.parse(data)) || {}
                    if (incremental) {
                        _.map(incremental || [], (_incremental: { items: string[]; path: (string | Number)[] }) => {
                            const { items, path } = _incremental || {}
                            const [chat, aiType, index] = path as [string, String, Number]
                            // console.log(`items`, items)
                            typeof onStream == `function` && onStream(items?.[0] || ``)
                        })
                    }
                } catch (err) {
                    console.log(`err`, err)
                    reject(err)
                }
            },
            completeHandler: value => {
                typeof onStream == `function` && onStream(`__{{streamCompleted}}__`)
                resolve(true)
            },
        })
    )
}

// 检查特定设备是否在使用中
const helperCheckDeviceInUse = async (deviceId: string) => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.some(device => device.deviceId === deviceId && device.kind === 'audioinput')
    } catch (err) {
        console.error('enumerateDevices() 失败:', err)
        return false
    }
}

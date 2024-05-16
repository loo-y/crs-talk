'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useMainStore } from '@/(pages)/main/providers'
import { fetchTokenOrRefresh, fetchAIGraphqlStream } from '@/shared/Fetches'
import type { SpeechToken } from '@/shared/interface'
import { recordingIdleGap } from '@/shared/constants'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import AudioVisualizer from '../AudioVisualizer'
import TextVisualizer from '../AudioVisualizer/TextVisualizer'
import CssVisualizer from '../AudioVisualizer/CssVisualizer'
import VoicePick from '../VoicePick'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { jailbrokenDan, psychological } from '@/shared/prompts'

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
            content: jailbrokenDan,
        },
    ])
    const [recordedTextList, setRecordedTextList] = useState<{ offset: string; text: string }[]>([])
    const [stateRecognizer, setStateRecognizer] = useState<Record<string, any>>()
    const [stateTTSSpeechConfig, setStateTTSSpeechConfig] = useState<Record<string, any>>()
    const [speechTokenOpenAI, setSpeechTokenOpenAI] = useState<SpeechToken>()
    const talkMessageListRef = useRef<HTMLDivElement>(null)
    const [selectedVoice, setSelectedVoice] = useState<Record<string, any>>({})

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

    const handleRecordingByNativeSpeech = (recognitionResult: Record<string, any>) => {
        console.log(`recognitionResult`, recognitionResult, recognitionResult.item)
        const { isFinal } = recognitionResult || {}
        const item = recognitionResult[0]
        if (item?.transcript?.length) {
            setRecordedTextList(recordedTextList => {
                const indexCurrent = isFinal ? -1 : recordedTextList?.length ? recordedTextList.length - 1 : -1
                if (indexCurrent > -1) {
                    recordedTextList[indexCurrent].text = item?.transcript || ''
                    return [...recordedTextList]
                } else {
                    return [...recordedTextList, { offset: String(Date.now()), text: item?.transcript || '' }]
                }
            })
        }

        if (!isFinal) {
            clearTimeout(recordingIdleTimer)
        }
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
                    toast('获取 Azure Token 成功')
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
                    toast('获取 OpenAI Token 成功')
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
    }, [talkMessageList, recordedTextList])

    const handlePlayAudio = async (text: string, voiceItem: Record<string, any>) => {
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
                await helperTts({
                    inputText: textPlay,
                    stateSpeechConfig: stateTTSSpeechConfig,
                    voiceName: voiceItem?.value || undefined,
                    speechToken:
                        speechTokenOpenAI?.authToken && voiceItem?.value && voiceItem?.isOpenai
                            ? speechTokenOpenAI
                            : speechToken,
                    callback: speechConfig => {
                        setStateTTSSpeechConfig(speechConfig)
                    },
                })
            }
        }
        // setStreamInQueuePlaying(false)
        streamInQueuePlaying = false
    }

    useEffect(() => {
        setRecordedTextList([])
        if (isRecording) {
            if (!speechToken) {
                const syncSpeechToken = async () => {
                    const { authToken, region } = await helperGetSpeechTokenAsync()
                    if (authToken && region) {
                        updateSpeechToken({ authToken, region })
                        talkStart &&
                            helperSttByNativeSpeech({
                                stateRecognizer,
                                // speechToken: { authToken, region },
                                // recording: handleRecording,
                                recording: handleRecordingByNativeSpeech,
                                callback: (recognizer: Record<string, any>) => {
                                    if (recognizer) {
                                        setStateRecognizer(recognizer)
                                    }
                                },
                            })
                    }
                }
                // console.log(`speechToken`, speechToken)
                syncSpeechToken()
            } else {
                talkStart &&
                    helperSttByNativeSpeech({
                        stateRecognizer,
                        // speechToken: speechToken || {},
                        // recording: handleRecording,
                        recording: handleRecordingByNativeSpeech,
                        callback: (recognizer: Record<string, any>) => {
                            if (recognizer) {
                                setStateRecognizer(recognizer)
                            }
                        },
                    })
            }
        } else if (stateRecognizer) {
            helperPauseSttByNativeSpeech(stateRecognizer)
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
                                    handlePlayAudio(streamText, selectedVoice)
                                }

                                // 用于通知结束
                                handlePlayAudio(text, selectedVoice)
                            } else {
                                let fixedText = text
                                if (/^[a-zA-Z]/.test(text) && /[a-zA-Z]$/.test(text)) {
                                    fixedText = ` ${text} `
                                } else if (/^[a-zA-Z]/.test(text)) {
                                    fixedText = ` ${text}`
                                } else if (/[a-zA-Z]$/.test(text)) {
                                    fixedText = `${text} `
                                }

                                streamText += fixedText

                                // if (['。', '!', '?', '！', '？'].includes(text.slice(-1))) {
                                //     handlePlayAudio(streamText)
                                //     streamText = ''
                                // }
                                setTalkMessageList(talkMessageList => {
                                    if (talkMessageList?.at(-1)?.role === 'assistant') {
                                        const newList = [...talkMessageList]
                                        newList!.at(-1)!.content += fixedText
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

    const handleOnVoicePick = (voice: Record<string, any>) => {
        console.log(`handleOnVoicePick`, voice)
        setSelectedVoice(voice)
    }
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
                            handlePlayAudio(streamText, selectedVoice)
                        }

                        // 用于通知结束
                        handlePlayAudio(text, selectedVoice)
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
        <>
            <div className="flex flex-row justify-end mt-2 w-full mb-2">
                <div className="flex flex-row justify-end mr-2">
                    <VoicePick onPick={handleOnVoicePick} />
                </div>
            </div>
            <div className=" w-[20rem] flex flex-col gap-2">
                <div className="flex talkCircle flex-col gap-2">
                    {/* {_.map(recordedTextList, (recordItem, recordIndex) => {
                    return (
                        <div key={`record-${recordIndex}`} className="flex">
                            {recordItem?.text || ''}
                        </div>
                    )
                })} */}
                    <CssVisualizer isMicOn={isRecording || false} />
                    {/* <AudioVisualizer isMicOn={isRecording || false} /> */}
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
            <Toaster />
        </>
    )
}

const helperSttByNativeSpeech = async ({
    stateRecognizer,
    recording,
    callback,
}: {
    stateRecognizer: any
    recording: (arg: any) => void
    callback?: (arg?: any) => void
}) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList
    const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent
    if (!SpeechRecognition) {
        alert(`your browser does not support speech`)
        return
    }
    let recognition
    if (stateRecognizer) {
        recognition = stateRecognizer
        recognition.start()
        return
    }
    recognition = new SpeechRecognition()
    recognition.continuous = true // 持续监听
    recognition.interimResults = true // 获取临时结果
    recognition.maxAlternatives = 1
    recognition.lang = 'zh-CN'
    recognition.onresult = (event: any) => {
        if (!event?.results?.length) return
        const result = event.results[event.results.length - 1]?.[0]?.transcript
        recording(event.results[event.results.length - 1])
    }
    recognition.start()
    callback && callback(recognition)
}

const helperPauseSttByNativeSpeech = async (recognizer: Record<string, any>) => {
    recognizer.stop()
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

const helperSttFromMic = async ({
    stateRecognizer,
    speechToken,
    recording,
    callback,
}: {
    stateRecognizer: any
    speechToken: SpeechToken
    recording: (arg: any) => void
    callback?: (arg?: any) => void
}) => {
    if (!speechToken?.authToken || !speechToken?.region) {
        alert(`Please get speech token first`)
        return
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(speechToken.authToken, speechToken.region)
    speechConfig.speechRecognitionLanguage = 'zh-CN'

    let recognizer // : SpeechSDK.SpeechRecognizer
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

    // recognizer.sessionStopped = (s, e) => {
    //     console.log("\n    Session stopped event.");
    //     // recognizer.stopContinuousRecognitionAsync();
    // };

    if (callback) {
        callback(recognizer)
    }
}

const helperPauseMic = async (recognizer: Record<string, any>) => {
    recognizer.stopContinuousRecognitionAsync()
}

const helperTts = async ({
    inputText,
    stateSpeechConfig,
    voiceName,
    speechToken,
    callback,
}: {
    inputText: string
    stateSpeechConfig: any
    voiceName?: string
    speechToken?: SpeechToken
    callback?: (synthesizer: any) => void
}) => {
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
            speechConfig.speechSynthesisVoiceName = voiceName || `zh-CN-XiaoxiaoMultilingualNeural` // `en-US-OnyxMultilingualNeural` // 'zh-CN-XiaoxiaoMultilingualNeural' // 'wuu-CN-XiaotongNeural' //

            typeof callback === 'function' && callback(speechConfig)
        } else {
            speechConfig = stateSpeechConfig
        }

        const audio = new SpeechSDK.SpeakerAudioDestination()
        // audio.format = SpeechSDK.AudioStreamFormat.getWaveFormat(16000, 1, 16, SpeechSDK.AudioFormatTag.MP3)
        audio.onAudioEnd = () => {
            clearTimeout(lazyResolve)
            console.log(`onAudioEnd`)
            synthesizer?.close()
            synthesizer = undefined
            fetch(`/api/logCatch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: 'info', info: `onAudioEnd, time: ${new Date()}` }),
            })
            resolve(true)
        }
        audio.onAudioStart = () => {
            console.log(`onAudioStart`)
            fetch(`/api/logCatch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: 'info', info: `onAudioStart, time: ${new Date()}` }),
            })

            // alert(`onAudioStart`)
        }

        const myCRSTalkCallback = new CRSTalkPushAudioOutputStreamCallback(() => {
            resolve(true)
        })
        // const myullAudioOutputStream = new MyAudioOutputStream()
        // myullAudioOutputStream.create(myCRSTalkCallback)
        if (speechConfig) {
            // myullAudioOutputStream.create(myCRSTalkCallback)
            // const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(audio)
            const audioConfig = SpeechSDK.AudioConfig.fromStreamOutput(myCRSTalkCallback)
            synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig)

            synthesizer?.speakTextAsync(
                inputText,
                function (result) {
                    fetch(`/api/logCatch`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            type: 'info',
                            info: `result.reason: ${result.reason}, time: ${new Date()}`,
                        }),
                    })

                    if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        console.log('TTS Speech synthesized for text: ' + inputText)

                        // myullAudioOutputStream.createPullStream()
                        // myullAudioOutputStream.read()
                        fetch(`/api/logCatch`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                type: 'info',
                                info: `result.reason: ${result.reason}, input: ${inputText}, time: ${new Date()}`,
                            }),
                        })

                        // setTimeout(() => {
                        //     resolve(true)
                        // }, 15 * 1000)
                        // resolve(true)
                    } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
                        alert(`error, cancel, ${result.errorDetails}`)
                        console.log('TTS Error: ' + result.errorDetails)
                        fetch(`/api/logCatch`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                type: 'info',
                                info: `result.reason: ${result.reason}, TTS Error:: ${result.errorDetails}, time: ${new Date()}`,
                            }),
                        })
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
                    fetch(`/api/logCatch`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ type: 'info', info: `reject ${err}, time: ${new Date()}` }),
                    })
                    synthesizer?.close()
                    synthesizer = undefined
                    resolve(false)
                }
                // myullAudioOutputStream
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
            // queryMoonshot: true,
            // queryWorkersAI: true,
            // workersAIParams: {
            //     model: '@cf/qwen/qwen1.5-7b-chat-awq',
            //     // model: `@hf/thebloke/neural-chat-7b-v3-1-awq`,
            // },
            queryOpenAI: true,
            openAIParams: {
                baseUrl: `https://openrouter.ai/api/v1`, // 'https://api.deepseek.com/v1/',
                model: `google/gemini-flash-1.5`, // `meta-llama/llama-3-8b-instruct:free`, // `google/gemini-flash-1.5`, // `openai/gpt-4o`, // 'deepseek-chat',
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

class MyAudioOutputStream extends SpeechSDK.PushAudioOutputStream {
    private internalBuffer: ArrayBuffer
    private _format: SpeechSDK.AudioStreamFormat | undefined // 假设 AudioStreamFormat 是一个已定义的类型

    constructor() {
        super()
        // 初始化一个空的 ArrayBuffer 作为内部缓冲区
        this.internalBuffer = new ArrayBuffer(0)
    }

    set format(format: SpeechSDK.AudioStreamFormat) {
        // 实现设置音频流格式的逻辑
        this._format = format
        console.log('Format set:', format)
    }

    // createPullStream(){
    //     console.log(`createPullStream`)
    // }
    // async read(dataBuffer?: ArrayBuffer) {
    //     console.log('readingd audio data:', dataBuffer)
    //     return 1;
    // }

    create(callback: SpeechSDK.PushAudioOutputStreamCallback) {
        console.log(`create`, callback)
        SpeechSDK.PushAudioOutputStream.create(callback)
    }
    close(): void {
        // 在这里实现音频输出流的关闭逻辑
        console.log('Closing audio output stream')
        // // 释放内部缓冲区
    }
}
class CRSTalkPushAudioOutputStreamCallback extends SpeechSDK.PushAudioOutputStreamCallback {
    private internalBuffer: ArrayBuffer
    private onClose?: () => void
    constructor(onClose?: () => void) {
        super()
        // 初始化一个空的 ArrayBuffer 作为内部缓冲区
        this.internalBuffer = new ArrayBuffer(0)
        this.onClose = onClose
    }

    write(dataBuffer: ArrayBuffer) {
        // 在这里实现将音频数据写入数据缓冲区的逻辑
        console.log('Writing audio data:', dataBuffer)
        // 计算当前内部缓冲区的大小
        let currentLength = this.internalBuffer.byteLength

        // 创建一个新的 ArrayBuffer，大小为当前内部缓冲区大小加上新数据的大小
        let newBuffer = new ArrayBuffer(currentLength + dataBuffer.byteLength)

        // 创建 DataView 来访问新的 ArrayBuffer
        let newView = new DataView(newBuffer)

        // 如果内部缓冲区不为空，则将内部缓冲区的数据复制到新的 ArrayBuffer 中
        if (currentLength > 0) {
            let oldView = new DataView(this.internalBuffer)
            for (let i = 0; i < currentLength; i++) {
                newView.setUint8(i, oldView.getUint8(i))
            }
        }

        // 将新数据复制到新的 ArrayBuffer 中
        let dataView = new DataView(dataBuffer)
        for (let i = 0; i < dataBuffer.byteLength; i++) {
            newView.setUint8(currentLength + i, dataView.getUint8(i))
        }

        // 更新内部缓冲区为新的 ArrayBuffer
        this.internalBuffer = newBuffer
    }

    close() {
        // 实际的实现可能涉及将数据发送到音频输出流或其他处理
        // 创建 AudioContext 实例
        const audioContext = new window.AudioContext()

        // 创建一个 Blob 对象，用于创建 Blob URL
        const blob = new Blob([this.internalBuffer], { type: 'audio/wav' }) // 假设音频数据是 WAV 格式
        const blobURL = URL.createObjectURL(blob)
        // 使用 getUserMedia 触发用户交互
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then(() => {
                // 用户已经进行了交互，可以开始播放音频
                // 加载 Blob URL 到 AudioBuffer
                fetch(blobURL)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        // 创建 AudioBufferSourceNode
                        const source = audioContext.createBufferSource()
                        source.buffer = audioBuffer
                        // 连接到目的地（扬声器）
                        source.connect(audioContext.destination)
                        // 开始播放
                        source.start()
                        source.onended = () => {
                            console.log('Audio playback has ended.')
                            this.onClose && this.onClose()
                        }
                    })
                    .catch(error => {
                        console.error('Error decoding audio data:', error)
                    })
            })
            .catch(error => {
                console.error('getUserMedia error:', error)
                // 在这里处理错误
                this.onClose && this.onClose()
            })

        // 释放 Blob URL 资源
        // URL.revokeObjectURL(blobURL);

        //   // 创建一个 Audio 元素
        //   const audioElement = new Audio(blobURL);

        //   // 播放音频
        //   audioElement.play().catch(error => {
        //   console.error('Error playing audio:', error);
        //   }).finally(() => {
        //   // 在播放结束后，关闭音频输出流

        //   });
        // 在这里实现关闭音频输出流的逻辑
        console.log('Closing the audio output stream')
        // 实际的实现可能涉及清理资源或发送关闭信号
    }
}

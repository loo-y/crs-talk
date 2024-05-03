'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useMainStore } from '@/(pages)/main/providers'
import { fetchTokenOrRefresh, fetchAIGraphqlStream } from '@/shared/Fetches'
import type { SpeechToken } from '@/shared/interface'
import { recordingIdleGap } from '@/shared/constants'
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { sleep } from '@/shared/tools'

const AudioVisualizer = ({ isMicOn }: { isMicOn: boolean }) => {
    const [stream, setStream] = useState<MediaStream>()
    const [renderer, setRenderer] = useState<any>(null)
    const [analyzer, setAnalyzer] = useState<any>(null)
    const [source, setSource] = useState<any>(null)
    // let analyzer: any = null
    const [audioContext, setAudioContext] = useState<any>(null)
    // let audioContext: any = null
    const mount = useRef<HTMLDivElement>(null!)
    const width = 384,
        height = 600

    // useEffect(()=>{
    //     // Audio context
    //     // @ts-ignore
    //     const AudioContext = window.AudioContext || window.webkitAudioContext
    //     const __audioContext__ = new AudioContext()
    //     setAudioContext(__audioContext__)
    //     const __analyzer__ = __audioContext__.createAnalyser()
    //     setAnalyzer(__analyzer__)

    // }, [])

    useEffect(() => {
        const scene = new THREE.Scene()
        // 创建一个圆形的几何体，这里使用一个扇形来近似圆形
        const circleGeometry = new THREE.TorusGeometry(0.3, 1, 200, 200) // 半径, 圆环宽度, 细分纬度, 细分经度

        // 创建一个材质
        const circleMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 })
        const circle = new THREE.Mesh(circleGeometry, circleMaterial)
        // 创建一个相机
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
        let __renderer__
        if (renderer) {
            __renderer__ = renderer
        } else {
            __renderer__ = new THREE.WebGLRenderer({ alpha: true, antialias: true })
            __renderer__.setSize(width, height)
            // 抗锯齿设置
            __renderer__.setPixelRatio(window.devicePixelRatio)
            __renderer__.shadowMap.enabled = true
            setRenderer(__renderer__)
        }

        if (!mount.current.hasChildNodes()) {
            mount.current.appendChild(__renderer__.domElement)
        }

        const geometry = new THREE.SphereGeometry(1, 32, 16)
        const material = new THREE.MeshBasicMaterial({ color: 'black' })

        const sphere = new THREE.Mesh(geometry, material)

        // scene.add(sphere)

        scene.add(circle)

        camera.position.z = 5

        // // Audio context
        // @ts-ignore
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const __audioContext__ = new AudioContext()
        setAudioContext(__audioContext__)
        const __analyzer__ = __audioContext__.createAnalyser()
        setAnalyzer(__analyzer__)
        // analyzer = __analyzer__
        // audioContext = new AudioContext()
        // analyzer = audioContext.createAnalyser()

        console.log(`audioContext first`, audioContext)
        const __getUserMedia__ =
            navigator.mediaDevices?.getUserMedia ||
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia
        if (!__getUserMedia__) {
            alert(`Your browser does not support getUserMedia.`)
            console.error('Your browser does not support getUserMedia.')
            return
        }

        let lazyScale: any = null
        let lastData = 0

        // navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        //     const source = __audioContext__.createMediaStreamSource(stream)
        //     source.connect(analyzer)
        // })

        let render = async () => {}
        console.log(`🐹🐹🐹 isMicOn: ${isMicOn}, analyzer`, analyzer, `source`, source)
        if (analyzer && isMicOn && source) {
            render = async () => {
                const data = new Uint8Array(analyzer.frequencyBinCount)
                analyzer.getByteFrequencyData(data as Uint8Array)
                // console.log(`render`, data)
                const scaleNumberX = 0.005,
                    scaleNumberY = 0.005,
                    scaleNumberZ = 0.005
                // use audio data here to update sphere properties

                let modefiedData = data[0] // parseInt(String(data[0]/10)) * 10
                console.log(`🐹🐹🐹 modefiedData, ${modefiedData}`)
                let between = modefiedData - lastData
                // console.log(`data[0]`, modefiedData, lastData, between)

                // await sleep(1)
                if (between > 0) {
                    if (Math.abs(between) > 2) {
                        for (let i = 0; i < between; ) {
                            // await sleep(1)
                            await sleep(0.001)
                            console.log(`111`)
                            circle.scale.set(
                                1 + Math.sin((lastData + i) * scaleNumberX),
                                1 + Math.sin((lastData + i) * scaleNumberY),
                                1 + Math.sin((lastData + i) * scaleNumberZ)
                            )
                            // renderer.render(scene, camera)
                            renderer.render(scene, camera)
                            // requestAnimationFrame(render)
                            i += 0.5
                        }
                    }
                } else {
                    if (Math.abs(between) > 2) {
                        for (let i = 0; i < Math.abs(between); ) {
                            await sleep(0.001)
                            console.log(222)
                            circle.scale.set(
                                1 + Math.sin((lastData - i) * scaleNumberX),
                                1 + Math.sin((lastData - i) * scaleNumberY),
                                1 + Math.sin((lastData - i) * scaleNumberZ)
                            )
                            // renderer.render(scene, camera)
                            renderer.render(scene, camera)
                            // requestAnimationFrame(render)
                            i += 0.3
                        }
                    }
                }

                lastData = modefiedData

                // await sleep(0.1)
                // renderer.render(scene, camera)
                requestAnimationFrame(render)
            }

            // render()
        }
        ;(renderer || __renderer__)?.render(scene, camera)
        requestAnimationFrame(render)
    }, [isMicOn, source])

    useEffect(() => {
        console.log(`isMicOn: ${isMicOn}, audioContext `, audioContext, analyzer, stream)
        // let stream: MediaStream | undefined = undefined;
        if (isMicOn) {
            // Get microphone
            navigator.mediaDevices.getUserMedia({ audio: true }).then(__stream__ => {
                const __source__ = audioContext.createMediaStreamSource(__stream__)
                setSource(__source__)
                __source__.connect(analyzer)
                !stream && setStream(__stream__)
            })
            // Update sphere based on audio data
        } else {
            if (stream) {
                if (source) {
                    source.disconnect()
                    console.log(`source disconnect`)
                }
                const tracks = stream.getTracks()
                tracks.forEach(track => {
                    track.stop()
                    track.enabled = false
                })
                const sourceTracks: MediaStreamTrack[] = source.mediaStream.getTracks()
                sourceTracks.forEach(track => {
                    track.stop()
                    track.enabled = false
                })
                setStream(undefined)
                setSource(undefined)
            }
        }
    }, [isMicOn, stream])

    return (
        <div>
            <div ref={mount} />
        </div>
    )
}

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
                let streamText = ''
                // fetch ai response
                helperGetAIResponse({
                    messages: [{ role: 'user', content: _.map(recordedTextList, 'text').join('\n') }],
                    onStream: async (responseStream: string) => {
                        const text = _.trim(responseStream).replace(/\*/g, '')
                        console.log('onStream', text)

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
                {/* <audio id="audio--view" muted={true} autoPlay={true} playsInline={true}></audio>
                <video id="camera--view" muted={true} autoPlay={true} playsInline={true}></video> */}
                <AudioVisualizer isMicOn={isRecording || false} />
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
            speechConfig.speechSynthesisVoiceName = 'zh-CN-XiaoxiaoMultilingualNeural'
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
                // model: 'hfl/llama-3-chinese-8b-instruct-gguf',
                // model: "microsoft/Phi-3-mini-4k-instruct-gguf",
                apiKey: 'lm-studio',
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

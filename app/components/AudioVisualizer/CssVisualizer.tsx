'use client'
import React, { useEffect, useState } from 'react'

const CssVisualizer = ({ isMicOn }: { isMicOn: boolean }) => {
    const [stream, setStream] = useState<MediaStream>()
    const [analyzer, setAnalyzer] = useState<any>(null)
    const [source, setSource] = useState<any>(null)
    const [audioContext, setAudioContext] = useState<any>(null)

    const [currentVoice, setCurrentVoice] = useState(0)

    // 初始化 scale 和 duration 值
    const [lastScale, setLastScale] = useState(0.5)
    const [scale, setScale] = useState(1)
    const [scaleEnd, setScaleEnd] = useState(0.5)
    const [scaleStatic, setScaleStatic] = useState(0.5)
    const [duration, setDuration] = useState(0.2)
    // 更新 scale 值的函数
    const updateScale = (newScale: number) => {
        setScale(newScale)
    }

    // 更新 duration 值的函数
    const updateDuration = (newDuration: number) => {
        setDuration(newDuration)
    }
    // 内联样式对象
    const animationStyles = {
        // display: 'inline-block', // 确保动画应用于内联元素
        animationName: 'scale-animation',
        animationDuration: `${duration}s`,
        animationIterationCount: `infinite`, // `infinite`, // 1, // 'infinite', // '1',
        transform: `scale(${scaleStatic})`,
        animationTimingFunction: 'cubic-bezier(0.550, 0.085, 0.680, 0.530)',
    }

    // 内联 keyframes 对象
    const keyframesStyles = `
        @keyframes scale-animation {
            0% {
                transform: scale(${lastScale});
                background-color: black;
            }
            50% {
                transform: scale(${scale});
                background-color: gray;
            }
            100% {
                transform: scale(${scaleEnd});
                background-color: black;
            }
        }
    `

    useEffect(() => {
        // setInterval(()=>{
        //     console.log(`setInterval`)
        //     updateDuration(Math.random() * 2)
        // }, 3 * 1000)
    }, [])
    const handleAnimationEnd = () => {
        console.log('handleAnimationEnd')
        // updateDuration(Math.random() * 2)
    }

    let _lastScale = 0
    const handleAnimationIteration = () => {
        console.log('handleAnimationIteration', currentVoice)
        if (!currentVoice) {
            setScale(0.5)
        } else {
            setScale(currentVoice)
        }

        // _lastScale = scaleEnd
        // // console.log(`scaleEnd`, scaleEnd, _lastScale)
        // setLastScale(_lastScale)
        // const newScaleEnd = Math.floor(Math.random() *  100)/100
        // setScaleEnd(newScaleEnd)
        // setScale(Math.floor(Math.random() *  100)/100)
    }

    // useEffect(() => {
    //     // @ts-ignore
    //     const AudioContext = window.AudioContext || window.webkitAudioContext
    //     const __audioContext__ = new AudioContext()
    //     setAudioContext(__audioContext__)
    //     const __analyzer__ = __audioContext__.createAnalyser()
    //     setAnalyzer(__analyzer__)
    //     console.log(`audioContext first`, audioContext)

    //     let render = async () => {}
    //     if (analyzer && isMicOn && source) {
    //         render = async () => {
    //             const data = new Uint8Array(analyzer.frequencyBinCount)
    //             analyzer.getByteFrequencyData(data as Uint8Array)

    //             let modefiedData = data[0] // parseInt(String(data[0]/10)) * 10
    //             // setScale(modefiedData / 100)

    //             console.log(`🐹🐹🐹 modefiedData, ${modefiedData}`)
    //             requestAnimationFrame(render)

    //         }
    //     }
    //     requestAnimationFrame(render)
    // }, [isMicOn, source])

    useEffect(() => {
        console.log(`isMicOn: ${isMicOn}, audioContext `, audioContext, analyzer, stream)

        if (isMicOn) {
            // Get microphone
            navigator.mediaDevices.getUserMedia({ audio: true }).then(__stream__ => {
                // const __source__ = audioContext.createMediaStreamSource(__stream__)
                // setSource(__source__)
                // __source__.connect(analyzer)
                // !stream && setStream(__stream__)

                // @ts-ignore
                const AudioContext = window.AudioContext || window.webkitAudioContext
                const __audioContext__ = new AudioContext()
                const __source__ = __audioContext__.createMediaStreamSource(__stream__)
                const __analyzer__ = __audioContext__.createAnalyser()
                __source__.connect(__analyzer__)

                let render = async () => {}
                render = async () => {
                    const data = new Uint8Array(__analyzer__.frequencyBinCount)
                    __analyzer__.getByteFrequencyData(data as Uint8Array)

                    let modefiedData = data[0] // parseInt(String(data[0]/10)) * 10
                    // setScale(modefiedData / 100)
                    const voice = modefiedData / 100
                    if (voice < 0.25) {
                        setCurrentVoice(0.5)
                        // }else if(voice < 0.5){
                        //     setCurrentVoice(0.3 + voice)
                    } else if (voice > 0.75) {
                        setCurrentVoice(0.75)
                    } else {
                        setCurrentVoice(voice)
                    }
                    // setCurrentVoice(0.4 + modefiedData / 100)

                    // console.log(`🐹🐹🐹 modefiedData, ${modefiedData}`)
                    requestAnimationFrame(render)
                }
                requestAnimationFrame(render)
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

    console.log(`lastScale: ${lastScale}, scale: ${scale}, scaleEnd: ${scaleEnd}`)
    return (
        <div className="flex items-center justify-center min-h-60">
            <style dangerouslySetInnerHTML={{ __html: keyframesStyles }} />
            <div
                className="w-40 h-40 bg-black rounded-full"
                style={animationStyles}
                onAnimationEnd={handleAnimationEnd}
                onAnimationIteration={handleAnimationIteration}
            ></div>
        </div>
    )
}

export default CssVisualizer

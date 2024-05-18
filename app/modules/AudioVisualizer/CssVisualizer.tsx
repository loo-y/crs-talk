'use client'
import React, { useCallback, useEffect, useState } from 'react'

const CssVisualizer = ({ isMicOn, isSignle = true }: { isMicOn: boolean; isSignle?: boolean }) => {
    const [currentVoice, setCurrentVoice] = useState(0)
    const [animationCount, setAnimationCount] = useState<string | number>(0)

    // 初始化 scale 和 duration 值
    const [lastScale, setLastScale] = useState(1)
    const [scale, setScale] = useState(isSignle ? 1 : 0.7)
    const [scaleEnd, setScaleEnd] = useState(1)
    const [scaleStatic, setScaleStatic] = useState(1)
    const [duration, setDuration] = useState(0.3)

    // 内联样式对象
    const animationStyles = {
        // display: 'inline-block', // 确保动画应用于内联元素
        animationName: 'scale-animation',
        animationDuration: `${duration}s`,
        animationIterationCount: `${animationCount}`, // `infinite`, // `infinite`, // 1, // 'infinite', // '1',
        transform: `scale(${scaleStatic})`,
        animationTimingFunction: 'cubic-bezier(0.550, 0.085, 0.680, 0.500)',
        // animationTimingFunction: 'cubic-bezier(0.550, 0.085, 0.680, 0.530)',
    }

    // 内联 keyframes 对象
    const keyframesStyles1 = `
        @keyframes scale-animation {
            0% {
                transform: scale(${lastScale});
                background-color: #000000;
            }
            50% {
                transform: scale(${scale});
                background-color: ${scale === 1 ? '#000' : '#111'};
            }
            75% {
                transform: scale(${scale});
                background-color: ${scale === 1 ? '#000' : '#0f0f0f'};
            }
            100% {
                transform: scale(${scaleEnd});
                background-color: #000000;
            }
        }
    `

    const keyframesStyles2 = `
        @keyframes scale-animation {
            0% {
                border-radius: 50%;
                transform: scale(1, 0.7);
              }
              50% {
                border-radius: 50%;
                transform: scale(1, ${scale});
              }
              100% {
                border-radius: 50%;
                transform: scale(1, 0.7);
              }
        }
    `
    // const keyframesStyles = keyframesStyles1
    const [keyframesStyles, setKeyframesStyles] = useState(keyframesStyles1)
    useEffect(() => {
        if (isSignle) {
            setKeyframesStyles(keyframesStyles1)
        } else {
            setKeyframesStyles(keyframesStyles2)
        }
    }, [isSignle, scale])

    const handleAnimationEnd = () => {
        console.log('handleAnimationEnd')
        // updateDuration(Math.random() * 2)
    }

    let _lastScale = 0
    const handleAnimationIteration = () => {
        console.log('handleAnimationIteration', currentVoice)
        if (!currentVoice) {
            setScale(isSignle ? 1 : 0.7)
        } else {
            setScale(currentVoice)
        }
    }

    const [mediaStream, setMediaStream] = useState<MediaStream>()
    useEffect(() => {
        let render = () => {}
        if (mediaStream) {
            // @ts-ignore
            const AudioContext = window.AudioContext || window.webkitAudioContext
            const __audioContext__ = new AudioContext()
            const __source__ = __audioContext__.createMediaStreamSource(mediaStream)
            let __analyzer__ = __audioContext__.createAnalyser()
            __source__.connect(__analyzer__)

            render = () => {
                const data = new Uint8Array(__analyzer__.frequencyBinCount)
                __analyzer__.getByteFrequencyData(data as Uint8Array)
                console.log(`data`, data[0])
                let modefiedData = data[0]
                const voice = modefiedData / 1200
                setCurrentVoice(1 + voice)
                requestAnimationFrame(render)
            }
            requestAnimationFrame(render)
        }

        // 组件卸载时，停止媒体流
        return () => {
            render = () => {}
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [mediaStream])

    useEffect(() => {
        if (isMicOn) {
            try {
                navigator.mediaDevices.getUserMedia({ audio: true }).then(__stream__ => {
                    setMediaStream(__stream__)
                    setAnimationCount(`infinite`)
                })
            } catch (err) {
                console.error('Error accessing the microphone', err)
            }
        } else {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop())
                setMediaStream(undefined)
            }
            setAnimationCount(0)
        }
    }, [isMicOn])

    console.log(`lastScale: ${lastScale}, scale: ${scale}, scaleEnd: ${scaleEnd}`)
    return (
        <div className="flex items-center justify-center min-h-60 flex-row gap-1">
            <style dangerouslySetInnerHTML={{ __html: keyframesStyles }} />
            {isSignle ? (
                <div
                    className="w-40 h-40 bg-black rounded-full"
                    style={animationStyles}
                    onAnimationEnd={handleAnimationEnd}
                    onAnimationIteration={handleAnimationIteration}
                ></div>
            ) : (
                <>
                    <div
                        className="w-16 h-28 bg-black rounded-full"
                        style={animationStyles}
                        onAnimationEnd={handleAnimationEnd}
                        onAnimationIteration={handleAnimationIteration}
                    ></div>
                    <div className="w-16 h-28 bg-black rounded-full" style={animationStyles}></div>
                    <div className="w-16 h-28 bg-black rounded-full" style={animationStyles}></div>
                    <div className="w-16 h-28 bg-black rounded-full" style={animationStyles}></div>
                </>
            )}
        </div>
    )
}

export default CssVisualizer

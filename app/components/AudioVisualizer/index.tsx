'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
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
        // console.log(`🐹🐹🐹 isMicOn: ${isMicOn}, analyzer`, analyzer, `source`, source)
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
                // console.log(`🐹🐹🐹 modefiedData, ${modefiedData}`)
                let between = modefiedData - lastData
                // console.log(`data[0]`, modefiedData, lastData, between)

                // await sleep(1)
                if (between > 0) {
                    if (Math.abs(between) > 2) {
                        for (let i = 0; i < between; ) {
                            // await sleep(1)
                            await sleep(0.001)
                            // console.log(`111`)
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
                            // console.log(222)
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
        if (isMicOn && audioContext) {
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

export default AudioVisualizer

'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import { sleep } from '@/shared/tools'

const TextVisualizer = ({ textSpeed }: { textSpeed: number }) => {
    const [renderer, setRenderer] = useState<any>(null)
    const mount = useRef<HTMLDivElement>(null!)
    const width = 384,
        height = 600

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

        let lastData = 0
        let render = async () => {}
        // if(textSpeed >-1){
        render = async () => {
            // console.log(`render`, data)
            const scaleNumberX = 0.005,
                scaleNumberY = 0.005,
                scaleNumberZ = 0.005
            // use audio data here to update sphere properties

            let modefiedData = textSpeed
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
        // }
        ;(renderer || __renderer__)?.render(scene, camera)
        requestAnimationFrame(render)
    }, [textSpeed])

    return (
        <div>
            <div ref={mount} />
        </div>
    )
}

export default TextVisualizer

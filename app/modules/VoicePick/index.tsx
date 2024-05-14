'use client'
import _ from 'lodash'
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { voicePickOptions } from '@/shared/constants'
const VoicePick = ({ onPick }: { onPick?: (voice: Record<string, any>) => void }) => {
    const handleValueChange = (value: string) => {
        if (onPick) {
            onPick(_.find(voicePickOptions, { value }) || voicePickOptions[0])
        }
    }
    useEffect(() => {
        handleValueChange(voicePickOptions[0].value)
    }, [])

    return (
        <Select onValueChange={handleValueChange}>
            <SelectTrigger className="w-36 text-center bg-slate-800 text-white font-semibold rounded-3xl">
                <SelectValue placeholder="Voice" />
            </SelectTrigger>
            <SelectContent className="min-w-[4rem]">
                {_.map(voicePickOptions, ({ value, content }) => (
                    <SelectItem key={value} value={value}>
                        {content}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export default VoicePick

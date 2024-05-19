'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ClientPrivate() {
    const [userData, setUserData] = useState<Record<string, any>>({})
    useEffect(() => {
        getUserInfo(data => {
            console.log(`data`, data)
            setUserData(data)
        })
    }, [])

    return <p>Hello {userData?.user?.email}</p>
}

const getUserInfo = async (callback: (data: Record<string, any>) => void) => {
    const supabase = createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        callback({ error: error })
        return { error }
    }

    callback(data)

    return data
}

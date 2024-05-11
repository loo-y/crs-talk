import _ from 'lodash'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    const body = await request.json()
    const { info, type } = body || {}

    console.log(`Type: ${type}, Log`, info)

    return new NextResponse('ok', { status: 200 })
}

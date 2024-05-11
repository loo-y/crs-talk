import _ from 'lodash'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
// import * as dotenv from 'dotenv'
// dotenv.config()

export const runtime = 'edge'

const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
const { AZURE_SPEECH_KEY: azureSpeechKey = '', AZURE_SPEECH_REGION: azureSpeechregion = '' } = env

// const speechConfig = MicrosoftSpeechSdk.SpeechConfig.fromSubscription(azureSpeechKey, azureSpeechregion);
// speechConfig.speechRecognitionLanguage = "zh-CN";
// https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support?tabs=stt#speech-to-text

export async function GET(request: NextRequest) {
    const headersList = headers()
    let response
    if (azureSpeechKey === 'paste-your-speech-key-here' || azureSpeechregion === 'paste-your-speech-region-here') {
        response = NextResponse.json({ error: `auth failed`, status: false }, { status: 400 })
    } else {
        const params = {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': azureSpeechKey,
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Type': 'application/json',
                'User-Agent': headersList.get('user-agent') || '',
                Cookie: headersList.get('cookie') || '',
                Origin: headersList.get('host') ? `https://${headersList.get('host')}/` : '',
            },
            body: null,
        }

        try {
            const tokenResponse: any = await fetch(
                `https://${azureSpeechregion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
                params
            )
            const tokenResponseResult = await tokenResponse.text()
            if (tokenResponseResult) {
                response = NextResponse.json(
                    { token: tokenResponseResult, region: azureSpeechregion, tokenResponse, status: false },
                    { status: 200 }
                )
            } else {
                response = NextResponse.json(
                    { error: `There was an error authorizing your speech key. no tokenResponse data`, status: false },
                    { status: 401 }
                )
            }
            response.headers.set('Access-Control-Allow-Origin', '*')
            response.headers.set('Content-Type', 'application/json')
        } catch (err) {
            console.log(`AzureSpeechCheck`, { err })
            response = NextResponse.json(
                { error: `There was an error authorizing your speech key.`, status: false },
                { status: 401 }
            )
        }
    }

    return response
}

// https://github.com/Azure-Samples/AzureSpeechReactSample

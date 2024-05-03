import MainPage from '@/(pages)/main/page'

export default function Home() {
    return (
        <main className="main h-full overflow-hidden flex min-h-screen flex-col items-center justify-between">
            <div>
                <MainPage />
            </div>
        </main>
    )
}

import MainPage from '@/(pages)/main/page'

export default function Home() {
    return (
        <main className="main h-full overflow-hidden">
            <div className="flex flex-col items-center justify-between">
                <MainPage />
            </div>
        </main>
    )
}

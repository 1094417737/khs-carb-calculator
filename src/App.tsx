import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { CalculatorProvider } from './context/CalculatorContext'
import { TrailProvider } from './context/TrailContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Container from './components/layout/Container'
import InputForm from './components/input/InputForm'
import VipModule from './components/vip/VipModule'
import StrategyPanel from './components/strategy/StrategyPanel'
import ResultsPanel from './components/results/ResultsPanel'
import TrailModule from './components/trail/TrailModule'

type AppMode = 'calculator' | 'trail'

export default function App() {
  const [mode, setMode] = useState<AppMode>('calculator')

  return (
    <ThemeProvider>
      <CalculatorProvider>
        <TrailProvider>
          <div className="min-h-screen flex flex-col">
            <Header mode={mode} onModeChange={setMode} />
            <main className="flex-1 py-6 sm:py-10">
              <Container>
                {mode === 'calculator' ? (
                  <div className="space-y-5">
                    <InputForm />
                    <VipModule />
                    <StrategyPanel />
                    <ResultsPanel />
                  </div>
                ) : (
                  <TrailModule />
                )}
              </Container>
            </main>
            <Footer />
          </div>
        </TrailProvider>
      </CalculatorProvider>
    </ThemeProvider>
  )
}

import { ThemeProvider } from './context/ThemeContext'
import { CalculatorProvider } from './context/CalculatorContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Container from './components/layout/Container'
import InputForm from './components/input/InputForm'
import StrategyPanel from './components/strategy/StrategyPanel'
import ResultsPanel from './components/results/ResultsPanel'

export default function App() {
  return (
    <ThemeProvider>
      <CalculatorProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 py-6 sm:py-10">
            <Container>
              <div className="space-y-5">
                <InputForm />
                <StrategyPanel />
                <ResultsPanel />
              </div>
            </Container>
          </main>
          <Footer />
        </div>
      </CalculatorProvider>
    </ThemeProvider>
  )
}

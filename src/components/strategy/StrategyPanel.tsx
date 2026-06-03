import Card from '../layout/Card'
import HomemadeToggle from './HomemadeToggle'
import RatioSelector from './RatioSelector'
import CommercialSelector from './CommercialSelector'
import { useCalculator } from '../../hooks/useCalculator'

export default function StrategyPanel() {
  const { strategyOptions } = useCalculator()

  return (
    <Card className="animate-slide-up">
      <h2 className="section-title">补给策略</h2>
      <div className="space-y-5">
        <HomemadeToggle />
        {strategyOptions.useHomemade ? (
          <div className="animate-fade-in">
            <RatioSelector />
          </div>
        ) : (
          <div className="animate-fade-in">
            <CommercialSelector />
          </div>
        )}
      </div>
    </Card>
  )
}

import Toggle from '../ui/Toggle'
import { useCalculator } from '../../hooks/useCalculator'

export default function CaffeineToggle() {
  const { planInputs, strategyOptions, setStrategyOption } = useCalculator()
  const weight = planInputs.weightKg
  const approxDose = Math.round(weight * 3)

  return (
    <Toggle
      enabled={strategyOptions.useCaffeine}
      onChange={(v) => setStrategyOption('useCaffeine', v)}
      label="咖啡因策略"
      description={
        strategyOptions.useCaffeine
          ? `基于 ${weight}kg 体重，预计总剂量约 ${approxDose}mg（赛前一次性）`
          : `开启后基于体重（${approxDose}mg 估算）制定咖啡因补充方案`
      }
    />
  )
}

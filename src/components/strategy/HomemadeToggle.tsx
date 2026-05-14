import Toggle from '../ui/Toggle'
import { useCalculator } from '../../hooks/useCalculator'

export default function HomemadeToggle() {
  const { strategyOptions, setStrategyOption } = useCalculator()

  return (
    <Toggle
      enabled={strategyOptions.useHomemade}
      onChange={(v) => setStrategyOption('useHomemade', v)}
      label="自制补给"
      description={
        strategyOptions.useHomemade
          ? '使用葡萄糖+果糖自制糖水，成本低、可控性高'
          : '选择商业能量胶和运动饮料产品'
      }
    />
  )
}

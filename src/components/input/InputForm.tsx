import { useMemo, useState } from 'react'
import { useCalculator } from '../../hooks/useCalculator'
import { BASE_CARB_RANGE, GI_CARB_MODIFIER, elevationCarbModifier } from '../../data/constants'
import Card from '../layout/Card'
import DurationInput, { SportMode } from './DurationInput'
import HRZoneSelector from './HRZoneSelector'
import WeightInput from './WeightInput'
import TemperatureInput from './TemperatureInput'
import ElevationInput from './ElevationInput'
import GITrainingSelector from './GITrainingSelector'
import SweatRateInput from './SweatRateInput'
import CustomCarbInput from './CustomCarbInput'
import CyclingPanel from './CyclingPanel'

export default function InputForm() {
  const { planInputs, setPlanInput } = useCalculator()
  const [sportMode, setSportMode] = useState<SportMode>(null)

  const hours = Math.floor(planInputs.durationMinutes / 60)
  const minutes = planInputs.durationMinutes % 60

  // 动态计算算法推荐碳水目标（与引擎一致）
  const defaultCarbTarget = useMemo(() => {
    const base = BASE_CARB_RANGE[planInputs.hrZone]
    const mod = GI_CARB_MODIFIER[planInputs.giTraining]
    const elev = elevationCarbModifier(planInputs.elevationGainM ?? 0, planInputs.durationMinutes)
    return Math.round(base.rec * mod.rec * elev)
  }, [planInputs.hrZone, planInputs.giTraining, planInputs.elevationGainM, planInputs.durationMinutes])

  const handleModeChange = (mode: SportMode) => {
    setSportMode(mode)
    if (mode === '越野') {
      setPlanInput('elevationGainM', 1500)
      setPlanInput('hrZone', '60-70')
      setPlanInput('cyclingEnabled', false)
    } else if (mode === '骑行') {
      setPlanInput('elevationGainM', 0)
      setPlanInput('hrZone', '60-70')
    } else if (mode === '跑步/马拉松') {
      setPlanInput('elevationGainM', 0)
      setPlanInput('hrZone', '70-80')
      setPlanInput('cyclingEnabled', false)
    }
  }

  return (
    <>
    <Card className="animate-slide-up">
      <h2 className="section-title">基本信息</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <DurationInput
          hours={hours}
          minutes={minutes}
          distanceKm={planInputs.distanceKm}
          onChange={(total) => setPlanInput('durationMinutes', total)}
          onDistanceChange={(km) => setPlanInput('distanceKm', km)}
          onModeChange={handleModeChange}
        />
        <WeightInput
          value={planInputs.weightKg}
          onChange={(v) => setPlanInput('weightKg', v)}
        />
        <div className="md:col-span-2">
          <HRZoneSelector
            value={planInputs.hrZone}
            onChange={(v) => setPlanInput('hrZone', v)}
          />
        </div>
        <TemperatureInput
          value={planInputs.tempC}
          onChange={(v) => setPlanInput('tempC', v)}
        />
        <ElevationInput
          value={planInputs.elevationGainM}
          onChange={(v) => setPlanInput('elevationGainM', v)}
          durationMinutes={planInputs.durationMinutes}
        />
        <GITrainingSelector
          value={planInputs.giTraining}
          onChange={(v) => setPlanInput('giTraining', v)}
        />
        <SweatRateInput
          enabled={planInputs.sweatRateProfile !== undefined}
          profile={planInputs.sweatRateProfile}
          onToggle={(on) => {
            if (!on) setPlanInput('sweatRateProfile', undefined)
            else setPlanInput('sweatRateProfile', 'Normal')
          }}
          onProfileChange={(p) => setPlanInput('sweatRateProfile', p)}
        />
        <div className="md:col-span-2">
          <CustomCarbInput
            value={planInputs.customCarbTarget}
            onChange={(v) => setPlanInput('customCarbTarget', v)}
            algorithmTarget={defaultCarbTarget}
          />
        </div>
      </div>
    </Card>
    {sportMode === '骑行' && <CyclingPanel />}
    </>
  )
}

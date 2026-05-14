import NumberInput from '../ui/NumberInput'

interface WeightInputProps {
  value: number
  onChange: (kg: number) => void
}

export default function WeightInput({ value, onChange }: WeightInputProps) {
  const lbs = Math.round(value * 2.2046)

  return (
    <NumberInput
      value={value}
      onChange={onChange}
      min={30}
      max={150}
      step={0.5}
      unit="kg"
      label="体重"
      sublabel={`≈ ${lbs} lbs`}
    />
  )
}

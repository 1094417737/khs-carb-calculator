import type { TrackPoint, Waypoint, CustomMarker } from '../../types/trail'
import { safeEnglishName } from './export-gpx'

function xmlSafe(s: string): string {
  return s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * TCX <PointType> 标准标签
 *
 * GEL       → Food
 * SALT      → Water
 * GEL+SALT  → Generic
 */
function waypointType(wp: Waypoint): string {
  const hasGel = wp.items.some(i => i.type === 'gel')
  const hasSalt = wp.items.some(i => i.type === 'salt')

  if (hasGel && hasSalt) return 'Generic'
  if (hasGel) return 'Food'
  if (hasSalt) return 'Water'
  return 'Generic'
}

export function generateTcxWithCoursePoints(
  trackPoints: TrackPoint[],
  waypoints: Waypoint[],
  safeMode: boolean = false,
  customMarkers?: CustomMarker[]
): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"',
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">',
    '  <Courses><Course><Name>Trail Nutrition Plan</Name><Track>',
  ]

  for (const pt of trackPoints) {
    lines.push(
      '        <Trackpoint>',
      `          <Position><LatitudeDegrees>${pt.lat}</LatitudeDegrees><LongitudeDegrees>${pt.lon}</LongitudeDegrees></Position>`,
      `          <AltitudeMeters>${pt.ele}</AltitudeMeters>`,
      `          <DistanceMeters>${pt.cumulativeDistanceKm * 1000}</DistanceMeters>`,
      '        </Trackpoint>'
    )
  }

  lines.push('      </Track>')

  for (const wp of waypoints) {
    const name = safeEnglishName(wp)
    const notes = safeMode
      ? wp.items.map(i => `${safeEnglishName(wp)} x${i.quantity}`).join(', ')
      : wp.items.map(i => `${i.itemName} x${i.quantity}`).join(', ')

    lines.push(
      '      <CoursePoint>',
      `        <Name>${xmlSafe(name)}</Name>`,
      '        <Position>',
      `          <LatitudeDegrees>${wp.lat}</LatitudeDegrees>`,
      `          <LongitudeDegrees>${wp.lon}</LongitudeDegrees>`,
      '        </Position>',
      `        <PointType>${waypointType(wp)}</PointType>`,
      `        <Notes>${xmlSafe(`${notes} · ${wp.distanceKm.toFixed(1)}km`)}</Notes>`,
      '      </CoursePoint>'
    )
  }

  if (customMarkers && customMarkers.length > 0) {
    for (let i = 0; i < customMarkers.length; i++) {
      const cm = customMarkers[i]
      const name = safeMode ? safeCustomTcxName(cm, i) : cm.name
      lines.push(
        '      <CoursePoint>',
        `        <Name>${xmlSafe(name)}</Name>`,
        '        <Position>',
        `          <LatitudeDegrees>${cm.lat}</LatitudeDegrees>`,
        `          <LongitudeDegrees>${cm.lon}</LongitudeDegrees>`,
        '        </Position>',
        `        <PointType>Generic</PointType>`,
        `        <Notes>${xmlSafe(cm.name)}</Notes>`,
        '      </CoursePoint>'
      )
    }
  }

  lines.push('    </Course></Courses></TrainingCenterDatabase>')
  return lines.join('\n')
}

const CUSTOM_KEYWORD_MAP: [string[], string][] = [
  // Priority 1: 赛道节点类 — CP/AS 最高优先，避免被 WATER/FOOD 误吞
  [['cp', '打卡'], 'CP'],
  [['sp', '补给站', '站'], 'AS'],
  [['起点', '出发'], 'START'],
  [['终点', '冲线'], 'FINISH'],
  // Priority 2: 战术与装备类
  [['包', '换装', '存包'], 'BAG'],
  [['杖', '棍', '帐', '拿', '收'], 'POLES'],
  // Priority 3: 补给与生存类
  [['水', '泉', '河'], 'WATER'],
  [['食', '饭', '店', '吃'], 'FOOD'],
  [['医', '救', '药'], 'MEDIC'],
  [['厕', '洗手'], 'WC'],
  // Priority 4: 地形与预警类
  [['险', '崖', '滑', '注意', '慢'], 'DANGER'],
  [['顶', '峰', '山头', '垭口'], 'PEAK'],
  [['桥'], 'BRIDGE'],
  [['路口', '岔', '拐'], 'TURN'],
  [['风景', '拍照', '观景'], 'VIEW'],
]

function safeCustomTcxName(cm: CustomMarker, index: number): string {
  const name = cm.name
  const lower = name.toLowerCase()
  const digits = name.match(/\d+/)

  for (const [keywords, label] of CUSTOM_KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return digits ? `${label}-${digits[0]}` : label
    }
  }

  // Fallback: 纯 ASCII 则转大写；含中文则通用编号
  if (/^[\x00-\x7F]+$/.test(name)) return name.toUpperCase()
  return `WPT-${index + 1}`
}
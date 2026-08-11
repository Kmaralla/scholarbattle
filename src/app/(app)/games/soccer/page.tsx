'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Constants ──────────────────────────────────────────────────────────────
const W = 1400, H = 840
const FX = 80, FY = 60, FW = 1240, FH = 720
const GOAL_H = 200, GOAL_D = 85
const GOAL_L = { x: FX - GOAL_D, y: FY + FH/2 - GOAL_H/2, w: GOAL_D, h: GOAL_H }
const GOAL_R = { x: FX + FW,     y: FY + FH/2 - GOAL_H/2, w: GOAL_D, h: GOAL_H }
const PLAYER_R = 12, BALL_R = 8
const PLAYER_SPEED = 3.8, BALL_FRICTION = 0.965
const SHOOT_POWER = 22, AI_SHOOT_POWER = 17
const CARRY_OFFSET = PLAYER_R + BALL_R + 1
const GAME_DURATION = 90

interface Country {
  id: string; name: string; flag: string
  primary: string; secondary: string; textColor: string
}
const COUNTRIES: Country[] = [
  { id:'brazil',      name:'Brazil',      flag:'🇧🇷', primary:'#ca8a04', secondary:'#15803d', textColor:'#111' },
  { id:'argentina',   name:'Argentina',   flag:'🇦🇷', primary:'#38bdf8', secondary:'#e0f2fe', textColor:'#111' },
  { id:'portugal',    name:'Portugal',    flag:'🇵🇹', primary:'#991b1b', secondary:'#15803d', textColor:'white' },
  { id:'france',      name:'France',      flag:'🇫🇷', primary:'#1e3a8a', secondary:'#bfdbfe', textColor:'white' },
  { id:'netherlands', name:'Netherlands', flag:'🇳🇱', primary:'#ea580c', secondary:'#1e3a8a', textColor:'white' },
  { id:'italy',       name:'Italy',       flag:'🇮🇹', primary:'#0284c7', secondary:'#e0f2fe', textColor:'white' },
  { id:'germany',     name:'Germany',     flag:'🇩🇪', primary:'#d4d4d8', secondary:'#18181b', textColor:'#111' },
  { id:'mexico',      name:'Mexico',      flag:'🇲🇽', primary:'#15803d', secondary:'#ef4444', textColor:'white' },
  { id:'spain',       name:'Spain',       flag:'🇪🇸', primary:'#dc2626', secondary:'#fbbf24', textColor:'white' },
  { id:'england',     name:'England',     flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', primary:'#f1f5f9', secondary:'#dc2626', textColor:'#111' },
]
function hexToRgba(hex: string, alpha: number) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

type Role = 'GK' | 'LB' | 'RB' | 'LW' | 'RW'
interface Player {
  id: number; team: 'blue'|'red'; role: Role
  x: number; y: number; vx: number; vy: number
  facingX: number; facingY: number; isUser: boolean
  stealLock: number    // frames this player cannot steal
  carryFrames: number  // how many frames this player has held the ball this possession
}
interface Ball { x: number; y: number; vx: number; vy: number }
interface Touch { active: boolean; startX: number; startY: number; dx: number; dy: number }
interface GS {
  players: Player[]; ball: Ball; keys: Set<string>; touch: Touch
  score: { blue: number; red: number }; timeLeft: number; lastGoalTime: number
  animFrame: number | null; timerInterval: ReturnType<typeof setInterval> | null
  stuckFrames: number; possessorId: number | null
  shootTrigger: boolean; dribbleFrames: number
  pickupCooldown: number  // frames ball can't be picked up after a kick
}

// All Blue players start in LEFT half, all Red in RIGHT half
const BLUE_HOME: Record<Role,[number,number]> = {
  GK: [FX+55,       FY+FH/2],
  LB: [FX+220,      FY+FH/2-155],
  RB: [FX+220,      FY+FH/2+155],
  LW: [FX+FW*0.40,  FY+FH/2-140],
  RW: [FX+FW*0.40,  FY+FH/2+140],
}
const RED_HOME: Record<Role,[number,number]> = {
  GK: [FX+FW-55,    FY+FH/2],
  LB: [FX+FW-220,   FY+FH/2+155],
  RB: [FX+FW-220,   FY+FH/2-155],
  LW: [FX+FW*0.60,  FY+FH/2+140],
  RW: [FX+FW*0.60,  FY+FH/2-140],
}

const POSITIONS: { id: Role; name: string; desc: string; emoji: string }[] = [
  { id:'GK', name:'Goalkeeper',     desc:'Guard your goal and make big saves!',    emoji:'🧤' },
  { id:'LB', name:'Left Defender',  desc:'Defend and support from the left side',  emoji:'🛡️' },
  { id:'RB', name:'Right Defender', desc:'Defend and support from the right side', emoji:'🛡️' },
  { id:'LW', name:'Left Striker',   desc:'Attack and score from the left wing',    emoji:'⚡' },
  { id:'RW', name:'Right Striker',  desc:'Attack and score from the right wing',   emoji:'⚡' },
]

function makePlayers(userRole: Role): Player[] {
  const roles: Role[] = ['GK','LB','RB','LW','RW']
  return [
    ...roles.map((r,i) => ({ id:i,    team:'blue' as const, role:r, x:BLUE_HOME[r][0], y:BLUE_HOME[r][1], vx:0, vy:0, facingX:1,  facingY:0, isUser:r===userRole, stealLock:0, carryFrames:0 })),
    ...roles.map((r,i) => ({ id:10+i, team:'red'  as const, role:r, x:RED_HOME[r][0],  y:RED_HOME[r][1],  vx:0, vy:0, facingX:-1, facingY:0, isUser:false,        stealLock:0, carryFrames:0 })),
  ]
}

function steerTo(p: Player, tx: number, ty: number, spd: number) {
  const dx = tx-p.x, dy = ty-p.y, d = Math.hypot(dx, dy)
  if (d < 2) { p.vx=0; p.vy=0; return }
  p.vx = dx/d*spd; p.vy = dy/d*spd
  p.facingX = dx/d; p.facingY = dy/d
}

function doShoot(gs: GS, shooter: Player, power: number, aimX?: number, aimY?: number) {
  const isBlue = shooter.team === 'blue'
  const goalCX = aimX ?? (isBlue ? GOAL_R.x + 5 : GOAL_L.x + GOAL_L.w - 5)
  const goalCY = aimY ?? FY + FH/2 + (Math.random()-0.5) * GOAL_H * 0.45
  const dx = goalCX - shooter.x, dy = goalCY - shooter.y
  const len = Math.hypot(dx, dy) || 1
  gs.ball.vx = dx/len * power
  gs.ball.vy = dy/len * power
  gs.ball.x  = shooter.x + dx/len * (CARRY_OFFSET + 4)
  gs.ball.y  = shooter.y + dy/len * (CARRY_OFFSET + 4)
  gs.possessorId = null
  gs.pickupCooldown = 90  // ball must travel far before anyone can pick up
  // Lock opponent for 120 frames AFTER the ball is free (not just 120 from shot).
  // Previously max(current,120) left only 30 frames of exclusive pickup window after
  // the 90-frame cooldown — the GK standing at the goal grabbed it instantly.
  for (const pl of gs.players) {
    if (pl.team !== shooter.team) pl.stealLock = Math.max(pl.stealLock, 90 + 120)
  }
}

// ── Move user ──────────────────────────────────────────────────────────────
function moveUser(gs: GS) {
  const u = gs.players.find(p => p.isUser)!
  let dx=0, dy=0
  if (gs.keys.has('ArrowLeft'))  dx -= 1
  if (gs.keys.has('ArrowRight')) dx += 1
  if (gs.keys.has('ArrowUp'))    dy -= 1
  if (gs.keys.has('ArrowDown'))  dy += 1
  if (gs.touch.active) {
    const MAX = 40
    dx += Math.max(-1, Math.min(1, gs.touch.dx / MAX))
    dy += Math.max(-1, Math.min(1, gs.touch.dy / MAX))
  }
  const len = Math.hypot(dx, dy)
  const hasBall = gs.possessorId === u.id
  // Dribble: burst of speed when triggered
  if (gs.dribbleFrames > 0) gs.dribbleFrames--
  const spd = (gs.dribbleFrames > 0 && hasBall) ? PLAYER_SPEED * 1.6 : PLAYER_SPEED
  if (len > 0) {
    u.vx = dx/len*spd; u.vy = dy/len*spd
    u.facingX = dx/len; u.facingY = dy/len
  } else {
    u.vx *= 0.8; u.vy *= 0.8
  }
  u.x = Math.max(FX+PLAYER_R, Math.min(FX+FW-PLAYER_R, u.x+u.vx))
  u.y = Math.max(FY+PLAYER_R, Math.min(FY+FH-PLAYER_R, u.y+u.vy))

  if (gs.shootTrigger) {
    if (hasBall) doShoot(gs, u, SHOOT_POWER)
    gs.shootTrigger = false
  }
}

// ── Move AI ────────────────────────────────────────────────────────────────
function moveAI(gs: GS) {
  const bx = gs.ball.x, by = gs.ball.y

  // When GK has ball: no chaser (GK will clear immediately, team holds)
  // When field player has ball: that player is the chaser (they attack)
  const chaser: Record<string, number> = {}
  for (const team of ['blue', 'red'] as const) {
    const gkHasBall = gs.players.some(p => p.id === gs.possessorId && p.team === team && p.role === 'GK')
    if (gkHasBall) { chaser[team] = -1; continue }
    const withBall = gs.players.find(p => p.id === gs.possessorId && p.team === team && !p.isUser && p.role !== 'GK')
    if (withBall) { chaser[team] = withBall.id; continue }
    let minDist = Infinity, minId = -1
    for (const p of gs.players) {
      if (p.isUser || p.team !== team || p.role === 'GK') continue
      const d = Math.hypot(p.x-bx, p.y-by)
      if (d < minDist) { minDist = d; minId = p.id }
    }
    chaser[team] = minId
  }

  for (const p of gs.players) {
    if (p.isUser) continue
    const isBlue = p.team === 'blue'
    const home   = isBlue ? BLUE_HOME[p.role] : RED_HOME[p.role]
    const hasBall = gs.possessorId === p.id
    let tx = home[0], ty = home[1], spd = PLAYER_SPEED * 0.88

    if (p.role === 'GK') {
      if (hasBall) {
        p.carryFrames++
        // Dribble toward own penalty-area exit for 25 frames before clearing —
        // prevents the instant-clear-then-immediate-pickup loop near goal
        if (p.carryFrames >= 50) {
          const midX = FX + FW/2 + (isBlue ? 140 : -140)
          const midY = FY + FH/2 + (Math.random()-0.5)*130
          doShoot(gs, p, AI_SHOOT_POWER, midX, midY)
          p.carryFrames = 0
        } else {
          tx = isBlue ? FX+160 : FX+FW-160
          ty = FY + FH/2
        }
      } else {
        tx = isBlue ? FX+60 : FX+FW-60
        ty = Math.max(FY+GOAL_H/2, Math.min(FY+FH-GOAL_H/2, by))
        if (Math.hypot(p.x-bx, p.y-by) < 150) { tx=bx; ty=by }
      }
    } else if (hasBall) {
      p.carryFrames++
      const goalX = isBlue ? FX+FW+20 : FX-20
      const distToGoal = Math.hypot(p.x-goalX, p.y-(FY+FH/2))
      // Must carry at least 40 frames AND be within 130px before shooting
      // This prevents the immediate-shoot-then-pickup loop
      if (p.carryFrames >= 70 && distToGoal < 260) {
        // Vary power and angle so not every shot is identical
        const powerVar = AI_SHOOT_POWER * (0.8 + Math.random() * 0.4)
        doShoot(gs, p, powerVar)
        p.carryFrames = 0
      } else {
        tx = goalX; ty = FY+FH/2; spd = PLAYER_SPEED * 1.2  // faster than chaser so possessor can escape
      }
    } else if (p.id === chaser[p.team]) {
      tx = bx + (Math.random()-0.5)*20; ty = by + (Math.random()-0.5)*20
      // Chase slower vs AI possessor so possession isn't immediately stolen
      const oppPossessor = gs.possessorId !== null
        ? gs.players.find(pl => pl.id === gs.possessorId)
        : null
      if (oppPossessor && oppPossessor.team !== p.team) {
        spd = oppPossessor.isUser ? PLAYER_SPEED * 0.88 : PLAYER_SPEED * 0.65
      }
    } else {
      // LW/RW retreat to deep defense when opponent has ball or ball is free
      const oppHasBall = gs.possessorId !== null &&
        gs.players.some(pl => pl.id === gs.possessorId && pl.team !== p.team)
      const ballFree = gs.possessorId === null
      if ((p.role === 'LW' || p.role === 'RW') && (oppHasBall || ballFree)) {
        tx = isBlue ? FX + FW * 0.15 : FX + FW * 0.85
        ty = home[1]
      } else {
        // Hold home position; actively move away if ball is too close
        const distToBall = Math.hypot(p.x-bx, p.y-by)
        if (distToBall < 95) {
          const awayX = p.x-bx, awayY = p.y-by
          const al = Math.hypot(awayX,awayY)||1
          tx = p.x + (awayX/al) * (95-distToBall+15)
          ty = p.y + (awayY/al) * (95-distToBall+15)
        }
      }
    }

    steerTo(p, tx, ty, spd)
    p.x = Math.max(FX+PLAYER_R, Math.min(FX+FW-PLAYER_R, p.x+p.vx))
    p.y = Math.max(FY+PLAYER_R, Math.min(FY+FH-PLAYER_R, p.y+p.vy))
  }
}

// ── Move ball / possession ─────────────────────────────────────────────────
function moveBall(gs: GS) {
  const b = gs.ball
  const cx = FX+FW/2, cy = FY+FH/2

  gs.pickupCooldown = Math.max(0, gs.pickupCooldown - 1)
  // Tick per-player steal locks
  for (const pl of gs.players) pl.stealLock = Math.max(0, pl.stealLock - 1)

  if (gs.possessorId !== null) {
    const p = gs.players.find(pl => pl.id === gs.possessorId)
    if (p) {
      // Use velocity direction for carry if moving, else use stored facing
      const sp = Math.hypot(p.vx, p.vy)
      const fx = sp > 0.4 ? p.vx/sp : p.facingX
      const fy = sp > 0.4 ? p.vy/sp : p.facingY
      b.x = p.x + fx * CARRY_OFFSET
      b.y = p.y + fy * CARRY_OFFSET
      b.vx = p.vx; b.vy = p.vy

      // Steal: opponent body-contacts possessor.
      // Lock the ENTIRE losing team so no teammate can immediately steal back
      // (the single-player lock let a different nearby teammate still steal on frame+1).
      for (const opp of gs.players) {
        if (opp.team === p.team) continue
        if (opp.stealLock > 0 && !opp.isUser) continue
        if (Math.hypot(opp.x-p.x, opp.y-p.y) < PLAYER_R * 2 + 2) {
          for (const loser of gs.players) {
            if (loser.team === p.team) loser.stealLock = 200
          }
          p.carryFrames = 0
          opp.carryFrames = 0
          gs.possessorId = opp.id
          opp.facingX = -fx || 1
          opp.facingY = -fy
          break
        }
      }
      return
    }
    gs.possessorId = null
  }

  // Wall bounce (minimum speed so ball never stops at wall)
  if (b.x-BALL_R < FX)    { b.x=FX+BALL_R;    b.vx= Math.max(5, Math.abs(b.vx)) }
  if (b.x+BALL_R > FX+FW) { b.x=FX+FW-BALL_R; b.vx=-Math.max(5, Math.abs(b.vx)) }
  if (b.y-BALL_R < FY)    { b.y=FY+BALL_R;    b.vy= Math.max(5, Math.abs(b.vy)) }
  if (b.y+BALL_R > FY+FH) { b.y=FY+FH-BALL_R; b.vy=-Math.max(5, Math.abs(b.vy)) }

  // GK save: runs BEFORE pickupCooldown/stealLock so shots can always be caught
  for (const p of gs.players) {
    if (p.role !== 'GK') continue
    if (Math.hypot(b.x-p.x, b.y-p.y) < PLAYER_R+BALL_R+4) {
      p.carryFrames = 0
      gs.possessorId = p.id
      gs.pickupCooldown = 0
      for (const opp of gs.players) {
        if (opp.team !== p.team) opp.stealLock = Math.max(opp.stealLock, 200)
      }
      return
    }
  }

  // First player to touch free ball gains possession (respect pickup cooldown + stealLock)
  if (gs.pickupCooldown <= 0) {
    for (const p of gs.players) {
      if (p.stealLock > 0 && !p.isUser) continue
      if (Math.hypot(b.x-p.x, b.y-p.y) < PLAYER_R+BALL_R) {
        p.carryFrames = 0
        gs.possessorId = p.id
        // Lock the other team so they can't immediately steal it back
        for (const opp of gs.players) {
          if (opp.team !== p.team) opp.stealLock = 200
        }
        return
      }
    }
  }

  // Stuck detection
  if (Math.hypot(b.vx, b.vy) < 1.0) {
    gs.stuckFrames++
    if (gs.stuckFrames > 55) {
      const tx=cx-b.x, ty=cy-b.y, tl=Math.hypot(tx,ty)||1
      b.vx = tx/tl*13+(Math.random()-.5)*5
      b.vy = ty/tl*13+(Math.random()-.5)*5
      gs.stuckFrames=0
    }
  } else { gs.stuckFrames=0 }

  b.x+=b.vx; b.y+=b.vy
  b.vx*=BALL_FRICTION; b.vy*=BALL_FRICTION
}

function separatePlayers(gs: GS) {
  const ps = gs.players
  const minD = PLAYER_R * 2 + 2
  // Run multiple iterations so dense clusters fully resolve each frame
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < ps.length; i++) {
      for (let j = i+1; j < ps.length; j++) {
        const a = ps[i], b = ps[j]
        const dx = b.x-a.x, dy = b.y-a.y
        const d = Math.hypot(dx, dy)
        if (d < minD && d > 0) {
          const push = (minD - d) / 2
          const nx = dx/d, ny = dy/d
          a.x -= nx*push; a.y -= ny*push
          b.x += nx*push; b.y += ny*push
          a.x = Math.max(FX+PLAYER_R, Math.min(FX+FW-PLAYER_R, a.x))
          a.y = Math.max(FY+PLAYER_R, Math.min(FY+FH-PLAYER_R, a.y))
          b.x = Math.max(FX+PLAYER_R, Math.min(FX+FW-PLAYER_R, b.x))
          b.y = Math.max(FY+PLAYER_R, Math.min(FY+FH-PLAYER_R, b.y))
        }
      }
    }
  }
}

function checkGoal(gs: GS, onGoal: (t:'blue'|'red')=>void, userRole: Role) {
  const b = gs.ball
  if (b.x-BALL_R < GOAL_L.x+GOAL_L.w && b.y>GOAL_L.y && b.y<GOAL_L.y+GOAL_L.h) {
    gs.lastGoalTime=Date.now(); gs.score.red++
    gs.players=makePlayers(userRole); gs.ball={x:W/2,y:H/2,vx:0,vy:0}
    gs.possessorId=null; gs.pickupCooldown=80
    // Red scored → Blue concedes → Blue kicks off: lock Red out so Blue reaches ball first
    for (const pl of gs.players) if (pl.team === 'red') pl.stealLock = 120
    onGoal('red')
  }
  if (b.x+BALL_R > GOAL_R.x && b.y>GOAL_R.y && b.y<GOAL_R.y+GOAL_R.h) {
    gs.lastGoalTime=Date.now(); gs.score.blue++
    gs.players=makePlayers(userRole); gs.ball={x:W/2,y:H/2,vx:0,vy:0}
    gs.possessorId=null; gs.pickupCooldown=80
    // Blue scored → Red concedes → Red kicks off: lock Blue out so Red reaches ball first
    for (const pl of gs.players) if (pl.team === 'blue') pl.stealLock = 120
    onGoal('blue')
  }
}

// ── Audio ──────────────────────────────────────────────────────────────────
let _ac: AudioContext | null = null
function getAC(): AudioContext {
  if (!_ac) _ac = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)()
  if (_ac.state === 'suspended') _ac.resume()
  return _ac
}

function noise(c: AudioContext, dur: number, fType: BiquadFilterType, freq: number, q: number, vol: number, t: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2-1
  const src = c.createBufferSource(); src.buffer = buf
  const flt = c.createBiquadFilter(); flt.type = fType; flt.frequency.value = freq; flt.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(flt); flt.connect(g); g.connect(c.destination)
  src.start(t); src.stop(t + dur)
}

function playWhistle(dur = 0.65) {
  const c = getAC(), t = c.currentTime
  const osc = c.createOscillator(), g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2400, t)
  osc.frequency.linearRampToValueAtTime(2760, t + 0.04)
  osc.frequency.linearRampToValueAtTime(2640, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.38, t + 0.025)
  g.gain.setValueAtTime(0.38, t + dur - 0.08)
  g.gain.linearRampToValueAtTime(0, t + dur)
  osc.connect(g); g.connect(c.destination)
  osc.start(t); osc.stop(t + dur)
  noise(c, dur, 'bandpass', 2620, 18, 0.07, t)
}

function playGoalWhistle() {
  playWhistle(0.35)
  setTimeout(() => playWhistle(0.55), 430)
}

function playKick() {
  const c = getAC(), t = c.currentTime
  const osc = c.createOscillator(), g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(230, t)
  osc.frequency.exponentialRampToValueAtTime(58, t + 0.08)
  g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
  osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + 0.15)
}

function playTouch() {
  const c = getAC(), t = c.currentTime
  const osc = c.createOscillator(), g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(290, t)
  osc.frequency.exponentialRampToValueAtTime(130, t + 0.05)
  g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + 0.09)
}

function startMusic(): () => void {
  const c = getAC()
  let nextT = c.currentTime + 0.1, beat = 0, stopped = false
  const bd = 60 / 124  // seconds per beat @ 124 BPM
  const bassF = [65.4, 73.4, 82.4, 73.4, 98.0, 87.3, 73.4, 65.4]
  const melF  = [261.6, 329.6, 392, 349.2, 440, 392, 329.6, 293.7]

  function sched(t: number, i: number) {
    const b8 = i % 8
    // Kick
    if (b8 === 0 || b8 === 4) {
      const o = c.createOscillator(), g = c.createGain()
      o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.2)
      g.gain.setValueAtTime(0.44, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.24)
    }
    // Snare
    if (b8 === 2 || b8 === 6) {
      noise(c, 0.14, 'bandpass', 1100, 0.9, 0.3, t)
      const o = c.createOscillator(), g = c.createGain()
      o.frequency.value = 200; g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.08)
    }
    // Hi-hat
    noise(c, 0.034, 'highpass', 8500, 1, 0.11, t)
    // Bass (every 2 beats)
    if (b8 % 2 === 0) {
      const o = c.createOscillator(), g = c.createGain()
      o.type = 'triangle'; o.frequency.value = bassF[(i / 2) % 8]
      g.gain.setValueAtTime(0.17, t); g.gain.linearRampToValueAtTime(0.001, t + bd * 1.85)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + bd * 2)
    }
    // Melody (every 2 beats)
    if (b8 % 2 === 0) {
      const o = c.createOscillator(), g = c.createGain()
      o.type = 'sine'; o.frequency.value = melF[(i / 2) % 8]
      g.gain.setValueAtTime(0.058, t); g.gain.linearRampToValueAtTime(0, t + bd * 1.75)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + bd * 2)
    }
  }

  const iv = setInterval(() => {
    if (stopped) return
    while (nextT < c.currentTime + 0.5) { sched(nextT, beat); nextT += bd; beat++ }
  }, 100)
  return () => { stopped = true; clearInterval(iv) }
}

// ── Draw ───────────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, gs: GS, blueCountry: Country, redCountry: Country) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#080518'; ctx.fillRect(0, 0, W, H)

  // ── Field ──
  ctx.save()
  ctx.beginPath(); (ctx as any).roundRect(FX, FY, FW, FH, 6); ctx.clip()
  ctx.fillStyle = '#166534'; ctx.fillRect(FX, FY, FW, FH)
  // Alternating grass stripes
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.025)'
    ctx.fillRect(FX + i * FW / 10, FY, FW / 10, FH)
  }
  ctx.restore()

  // Field markings
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2
  ctx.strokeRect(FX + 1, FY + 1, FW - 2, FH - 2)
  // Halfway line
  ctx.beginPath(); ctx.moveTo(FX + FW/2, FY); ctx.lineTo(FX + FW/2, FY + FH); ctx.stroke()
  // Center circle
  ctx.beginPath(); ctx.arc(FX + FW/2, FY + FH/2, 70, 0, Math.PI*2)
  ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.stroke()
  // Center spot
  ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(FX + FW/2, FY + FH/2, 4, 0, Math.PI*2); ctx.fill()
  // Penalty areas
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5
  ctx.strokeRect(FX, FY + FH/2 - 130, 170, 260)
  ctx.strokeRect(FX + FW - 170, FY + FH/2 - 130, 170, 260)
  // 6-yard boxes
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1
  ctx.strokeRect(FX, FY + FH/2 - 65, 65, 130)
  ctx.strokeRect(FX + FW - 65, FY + FH/2 - 65, 65, 130)
  // Penalty spots
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath(); ctx.arc(FX + 130, FY + FH/2, 3, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(FX + FW - 130, FY + FH/2, 3, 0, Math.PI*2); ctx.fill()
  // Corner arcs
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(FX,      FY,      13, 0,          Math.PI/2);        ctx.stroke()
  ctx.beginPath(); ctx.arc(FX + FW, FY,      13, Math.PI/2,  Math.PI);          ctx.stroke()
  ctx.beginPath(); ctx.arc(FX + FW, FY + FH, 13, Math.PI,    3*Math.PI/2);      ctx.stroke()
  ctx.beginPath(); ctx.arc(FX,      FY + FH, 13, 3*Math.PI/2, 2*Math.PI);       ctx.stroke()

  // ── Goals ──
  const drawGoal = (g: {x:number,y:number,w:number,h:number}, left: boolean, country: Country) => {
    // Net fill
    ctx.fillStyle = hexToRgba(country.primary, 0.12)
    ctx.fillRect(g.x, g.y, g.w, g.h)
    // Net grid
    ctx.strokeStyle = hexToRgba(country.primary, 0.28); ctx.lineWidth = 0.8
    for (let i=1;i<6;i++){const x=g.x+i*g.w/6;ctx.beginPath();ctx.moveTo(x,g.y);ctx.lineTo(x,g.y+g.h);ctx.stroke()}
    for (let i=1;i<5;i++){const y=g.y+i*g.h/5;ctx.beginPath();ctx.moveTo(g.x,y);ctx.lineTo(g.x+g.w,y);ctx.stroke()}
    // Posts
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 3.5
    ctx.beginPath()
    if (left){ ctx.moveTo(g.x+g.w,g.y); ctx.lineTo(g.x,g.y); ctx.lineTo(g.x,g.y+g.h); ctx.lineTo(g.x+g.w,g.y+g.h) }
    else     { ctx.moveTo(g.x,g.y);     ctx.lineTo(g.x+g.w,g.y); ctx.lineTo(g.x+g.w,g.y+g.h); ctx.lineTo(g.x,g.y+g.h) }
    ctx.stroke()
    // Goal-line accent
    ctx.strokeStyle = hexToRgba(country.primary, 0.9); ctx.lineWidth = 2.5
    ctx.beginPath()
    if (left){ ctx.moveTo(g.x+g.w, g.y); ctx.lineTo(g.x+g.w, g.y+g.h) }
    else     { ctx.moveTo(g.x,     g.y); ctx.lineTo(g.x,     g.y+g.h) }
    ctx.stroke()
  }
  drawGoal(GOAL_L, true, blueCountry); drawGoal(GOAL_R, false, redCountry)

  // Team labels
  ctx.font = 'bold 11px sans-serif'; ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'left';  ctx.fillText(`◀ ${blueCountry.flag} ${blueCountry.name}`, FX + 6, FY + 7)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'right'; ctx.fillText(`${redCountry.name} ${redCountry.flag} ▶`,  FX + FW - 6, FY + 7)

  // ── Players ──
  for (const p of gs.players) {
    const hasBall = gs.possessorId === p.id
    const isBlue  = p.team === 'blue'
    const country = isBlue ? blueCountry : redCountry
    const col     = country.primary
    const border  = country.secondary

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + PLAYER_R + 2, PLAYER_R * 0.9, 4, 0, 0, Math.PI*2); ctx.fill()

    // Glow ring when possessing
    if (hasBall) {
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R + 6, 0, Math.PI*2)
      ctx.strokeStyle = 'rgba(250,204,21,0.8)'; ctx.lineWidth = 3; ctx.stroke()
    }
    // GK dashed ring
    if (p.role === 'GK') {
      ctx.setLineDash([3,3])
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R + 3, 0, Math.PI*2)
      ctx.strokeStyle = 'rgba(253,230,138,0.6)'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.setLineDash([])
    }

    // Body
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI*2)
    ctx.fillStyle = col; ctx.fill()
    ctx.strokeStyle = hasBall ? '#facc15' : border; ctx.lineWidth = hasBall ? 2.5 : 1.8; ctx.stroke()

    // Inner highlight (3-D feel)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, PLAYER_R * 0.48, 0, Math.PI*2); ctx.fill()

    // Role label
    ctx.fillStyle = country.textColor; ctx.font = 'bold 8px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(p.role, p.x, p.y)

    // User marker (yellow arrow)
    if (p.isUser) {
      const ay = p.y - PLAYER_R - 9
      ctx.fillStyle = '#fde047'
      ctx.beginPath(); ctx.moveTo(p.x, ay - 7); ctx.lineTo(p.x - 6, ay); ctx.lineTo(p.x + 6, ay)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke()
    }
  }

  // ── Ball ──
  const b = gs.ball
  const spd = Math.hypot(b.vx, b.vy)
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + BALL_R + 1, BALL_R * 0.85, 3.5, 0, 0, Math.PI*2); ctx.fill()
  // Body
  ctx.fillStyle = '#f1f5f9'
  ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()
  // Spinning panels
  ctx.fillStyle = '#111827'
  const spin = (Date.now() * 0.004 * Math.max(0.4, spd * 0.12)) % (Math.PI*2)
  for (let i = 0; i < 5; i++) {
    const a  = spin + (i * Math.PI*2) / 5
    const px = b.x + Math.cos(a) * BALL_R * 0.42
    const py = b.y + Math.sin(a) * BALL_R * 0.42
    ctx.beginPath(); ctx.arc(px, py, 2.1, 0, Math.PI*2); ctx.fill()
  }
  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath(); ctx.arc(b.x - 2.5, b.y - 2.5, 2.4, 0, Math.PI*2); ctx.fill()

  // ── Touch joystick ──
  if (gs.touch.active) {
    const {startX, startY, dx, dy} = gs.touch
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath(); ctx.arc(startX, startY, 42, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    const jx = startX + Math.max(-42, Math.min(42, dx))
    const jy = startY + Math.max(-42, Math.min(42, dy))
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(jx, jy, 16, 0, Math.PI*2); ctx.fill()
  }
}

// ── Page component ─────────────────────────────────────────────────────────
export default function SoccerPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'country'|'pick'|'play'|'over'>('country')
  const [userRole, setUserRole] = useState<Role>('LW')
  const [userCountry, setUserCountry] = useState<Country>(COUNTRIES[0])
  const [oppCountry, setOppCountry]   = useState<Country>(COUNTRIES[1])
  const [score, setScore] = useState({blue:0, red:0})
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [lastGoal, setLastGoal] = useState<'blue'|'red'|null>(null)
  const [hasBall, setHasBall] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const wrapperRef      = useRef<HTMLDivElement>(null)
  const gsRef           = useRef<GS | null>(null)
  const hasBallRef      = useRef(false)
  const blueCountryRef  = useRef<Country>(COUNTRIES[0])
  const redCountryRef   = useRef<Country>(COUNTRIES[1])

  useEffect(() => {
    const onFull = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])

  const startGame = useCallback((role: Role) => {
    const others = COUNTRIES.filter(c => c.id !== userCountry.id)
    const opp = others[Math.floor(Math.random() * others.length)]
    setOppCountry(opp)
    blueCountryRef.current = userCountry
    redCountryRef.current  = opp
    setUserRole(role); setScore({blue:0,red:0}); setTimeLeft(GAME_DURATION)
    setLastGoal(null); setHasBall(false); setPhase('play')
  }, [userCountry])

  function toggleFullscreen() {
    if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }
  function triggerShoot()  { if (gsRef.current) gsRef.current.shootTrigger = true }
  function triggerDribble() { if (gsRef.current) gsRef.current.dribbleFrames = 35 }

  useEffect(() => {
    if (phase !== 'play') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gs: GS = {
      players: makePlayers(userRole),
      ball: { x:W/2, y:H/2, vx:0, vy:0 },
      keys: new Set(),
      touch: { active:false, startX:0, startY:0, dx:0, dy:0 },
      score: { blue:0, red:0 },
      timeLeft: GAME_DURATION,
      lastGoalTime: 0,
      animFrame: null,
      timerInterval: null,
      stuckFrames: 0,
      possessorId: null,
      shootTrigger: false,
      dribbleFrames: 0,
      pickupCooldown: 80,
    }
    gsRef.current = gs

    // Kickoff whistle + background music
    playWhistle()
    const stopMusic = startMusic()

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault()
      gs.keys.add(e.key)
      if (e.key === ' ') gs.shootTrigger = true
      if (e.key === 'x' || e.key === 'X') gs.dribbleFrames = 35
    }
    const onKeyUp = (e: KeyboardEvent) => { gs.keys.delete(e.key) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    const getScale = () => W / canvas.getBoundingClientRect().width
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const t=e.touches[0], r=canvas.getBoundingClientRect(), sc=getScale()
      gs.touch = { active:true, startX:(t.clientX-r.left)*sc, startY:(t.clientY-r.top)*sc, dx:0, dy:0 }
    }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (!gs.touch.active) return
      const t=e.touches[0], r=canvas.getBoundingClientRect(), sc=getScale()
      gs.touch.dx=(t.clientX-r.left)*sc-gs.touch.startX
      gs.touch.dy=(t.clientY-r.top)*sc-gs.touch.startY
    }
    const onTouchEnd = () => { gs.touch={active:false,startX:0,startY:0,dx:0,dy:0} }
    canvas.addEventListener('touchstart', onTouchStart, {passive:false})
    canvas.addEventListener('touchmove',  onTouchMove,  {passive:false})
    canvas.addEventListener('touchend',   onTouchEnd)

    gs.timerInterval = setInterval(() => {
      if (!gsRef.current) return
      gsRef.current.timeLeft = Math.max(0, gsRef.current.timeLeft-1)
      setTimeLeft(gsRef.current.timeLeft)
      if (gsRef.current.timeLeft <= 0) { setScore({...gsRef.current.score}); setPhase('over') }
    }, 1000)

    const onGoal = (team: 'blue'|'red') => {
      setScore({...gs.score}); setLastGoal(team)
      setTimeout(() => setLastGoal(null), 2500)
      playGoalWhistle()
    }

    let lastTouchSoundTime = 0  // throttle ball-touch sound to avoid rapid fire

    const loop = () => {
      const paused = Date.now()-gs.lastGoalTime < 1800
      if (!paused) {
        const prevPossessorId = gs.possessorId
        const userId = gs.players.find(p => p.isUser)?.id
        const userWillShoot = gs.shootTrigger && gs.possessorId === userId

        moveUser(gs); moveAI(gs); moveBall(gs)
        separatePlayers(gs)
        checkGoal(gs, onGoal, userRole)

        // Sound: kick when user shoots, touch when anyone picks up a free ball
        const now = Date.now()
        if (userWillShoot) {
          playKick()
          lastTouchSoundTime = now
        } else if (gs.possessorId !== null && gs.possessorId !== prevPossessorId && now - lastTouchSoundTime > 180) {
          playTouch()
          lastTouchSoundTime = now
        }

        const user = gs.players.find(p => p.isUser)
        const nowHasBall = user ? gs.possessorId === user.id : false
        if (nowHasBall !== hasBallRef.current) { hasBallRef.current = nowHasBall; setHasBall(nowHasBall) }
      }
      draw(ctx, gs, blueCountryRef.current, redCountryRef.current)
      gs.animFrame = requestAnimationFrame(loop)
    }
    gs.animFrame = requestAnimationFrame(loop)

    return () => {
      if (gs.animFrame)    cancelAnimationFrame(gs.animFrame)
      if (gs.timerInterval) clearInterval(gs.timerInterval)
      stopMusic()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, userRole])

  return (
    <div className="flex flex-col items-center min-h-screen p-3" style={{background:'linear-gradient(135deg,#0f0a2e,#1a1040)'}}>

      {/* Country picker */}
      {phase==='country' && (
        <div className="w-full max-w-md space-y-4 pt-4">
          <button onClick={() => router.back()} className="text-white/40 text-sm font-semibold hover:text-white transition">← Back</button>
          <div className="text-center space-y-1">
            <div className="text-5xl">⚽</div>
            <h1 className="text-2xl font-black text-white">ScholarBattle Soccer</h1>
            <p className="text-white/50 text-sm">Pick your country</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COUNTRIES.map(c => (
              <button key={c.id} onClick={() => setUserCountry(c)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all"
                style={userCountry.id===c.id
                  ? { border: `1.5px solid ${c.primary}`, background: c.primary + '28', color: 'white' }
                  : { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }
                }>
                <span className="text-2xl leading-none">{c.flag}</span>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm leading-tight">{c.name}</p>
                </div>
                <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{background: c.primary}} />
                {userCountry.id===c.id && <span className="text-xs font-black">✓</span>}
              </button>
            ))}
          </div>
          <button onClick={() => setPhase('pick')}
            className="w-full py-4 rounded-2xl font-black text-white text-lg active:scale-95 transition-all"
            style={{background:'linear-gradient(135deg,#6366f1,#4338ca)'}}>
            Choose Position →
          </button>
        </div>
      )}

      {/* Position picker */}
      {phase==='pick' && (
        <div className="w-full max-w-md space-y-4 pt-4">
          <button onClick={() => setPhase('country')} className="text-white/40 text-sm font-semibold hover:text-white transition">← Back</button>
          <div className="text-center space-y-1">
            <div className="text-5xl">{userCountry.flag}</div>
            <h1 className="text-2xl font-black text-white">{userCountry.name}</h1>
            <p className="text-white/50 text-sm">5v5 · Choose your position</p>
          </div>
          <div className="space-y-2">
            {POSITIONS.map(pos => (
              <button key={pos.id} onClick={() => setUserRole(pos.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all ${
                  userRole===pos.id ? 'bg-indigo-500/25 border-indigo-400/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'
                }`}>
                <span className="text-2xl">{pos.emoji}</span>
                <div className="text-left">
                  <p className="font-black text-sm">{pos.name}</p>
                  <p className="text-xs text-white/40">{pos.desc}</p>
                </div>
                {userRole===pos.id && <span className="ml-auto text-indigo-300 font-black text-lg">✓</span>}
              </button>
            ))}
          </div>
          <button onClick={() => startGame(userRole)}
            className="w-full py-4 rounded-2xl font-black text-white text-lg active:scale-95 transition-all"
            style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>
            ⚽ Kick Off!
          </button>
        </div>
      )}

      {/* Game */}
      {phase==='play' && (
        <div ref={wrapperRef} className={isFullscreen ? 'w-full h-screen flex flex-col p-2 gap-1' : 'w-full space-y-2 pt-1'}
          style={isFullscreen ? {background:'#08051c'} : {}}>
          {/* HUD */}
          <div className="flex items-center justify-between px-2 py-0.5">
            <button onClick={() => setPhase('over')} className="text-white/25 text-xs hover:text-white/60 transition px-2 py-1">✕</button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-black text-blue-400 leading-none">{score.blue}</div>
                <div className="text-[10px] text-blue-400/50 font-bold">{userCountry.flag} YOU</div>
              </div>
              <div className={`px-4 py-1 rounded-xl border font-black text-sm tabular-nums ${timeLeft<=15?'border-red-500/50 bg-red-500/15 text-red-400':'border-white/10 bg-white/5 text-white/70'}`}>
                {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-red-400 leading-none">{score.red}</div>
                <div className="text-[10px] text-red-400/50 font-bold">{oppCountry.flag} OPP</div>
              </div>
            </div>
            <button onClick={toggleFullscreen} className="text-white/30 hover:text-white/70 text-lg px-2 py-1 transition" title="Fullscreen">⛶</button>
          </div>

          {/* Aspect-ratio wrapper prevents zoom glitch when layout changes (score/goal flash) */}
          <div style={isFullscreen
            ? { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
            : { width: '100%', aspectRatio: `${W}/${H}`, borderRadius: '1rem', overflow: 'hidden' }
          }>
            <canvas ref={canvasRef} width={W} height={H}
              className="touch-none"
              style={isFullscreen
                ? { maxWidth: '100%', maxHeight: '100%', display: 'block', borderRadius: '0.5rem' }
                : { width: '100%', height: '100%', display: 'block' }
              } />
          </div>

          {/* Goal flash */}
          {lastGoal && (
            <div className={`text-center py-0.5 font-black text-sm tracking-wide ${lastGoal==='blue'?'text-blue-300':'text-red-300'}`}>
              {lastGoal==='blue' ? `🎉 GOAL — ${userCountry.flag} ${userCountry.name} scores!` : `💥 GOAL — ${oppCountry.flag} ${oppCountry.name} scores!`}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 px-2 pb-1">
            <button
              onPointerDown={triggerDribble}
              className="flex-1 py-4 rounded-2xl font-black text-white text-base select-none touch-none active:scale-95 transition-transform"
              style={{background:'linear-gradient(160deg,#6366f1,#4338ca)', boxShadow:'0 4px 14px rgba(99,102,241,0.4)', border:'1px solid rgba(165,180,252,0.25)'}}
            >
              💨 Dribble
            </button>
            <button
              onPointerDown={triggerShoot}
              className={`flex-1 py-4 rounded-2xl font-black text-base select-none touch-none active:scale-95 transition-all ${hasBall ? 'text-white' : 'text-white/25'}`}
              style={hasBall
                ? {background:'linear-gradient(160deg,#22c55e,#15803d)', boxShadow:'0 4px 14px rgba(34,197,94,0.45)', border:'1px solid rgba(134,239,172,0.3)'}
                : {background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}
            >
              ⚽ Shoot
            </button>
          </div>

          <p className="text-white/20 text-xs text-center pb-1">Arrow keys · Space = shoot · X = dribble</p>
        </div>
      )}

      {/* Game over */}
      {phase==='over' && (
        <div className="w-full max-w-sm space-y-5 pt-8 text-center">
          <div className="text-6xl">{score.blue>score.red?'🏆':score.blue===score.red?'🤝':'😤'}</div>
          <h2 className="text-2xl font-black text-white">
            {score.blue>score.red?`${userCountry.flag} You Won!`:score.blue===score.red?"It's a Draw!":score.red>score.blue?`${oppCountry.flag} They Win!`:''}
          </h2>
          <div className="flex justify-center gap-8">
            <div>
              <p className="text-5xl font-black text-blue-400">{score.blue}</p>
              <p className="text-xs text-white/40 mt-1">{userCountry.flag} {userCountry.name}</p>
            </div>
            <div className="text-2xl font-black text-white/20 self-center">—</div>
            <div>
              <p className="text-5xl font-black text-red-400">{score.red}</p>
              <p className="text-xs text-white/40 mt-1">{oppCountry.flag} {oppCountry.name}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => startGame(userRole)}
              className="flex-1 py-3 rounded-2xl font-black text-white text-sm"
              style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>
              🔁 Play Again
            </button>
            <button onClick={() => setPhase('pick')}
              className="flex-1 py-3 rounded-2xl border border-white/15 text-white/70 font-bold text-sm hover:bg-white/5 transition">
              Position
            </button>
          </div>
          <button onClick={() => setPhase('country')} className="text-white/40 text-sm hover:text-white transition">Change Country</button>
          <button onClick={() => router.back()} className="text-white/30 text-sm hover:text-white transition block mx-auto mt-1">Back to Games</button>
        </div>
      )}
    </div>
  )
}

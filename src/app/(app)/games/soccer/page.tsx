'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Constants ──────────────────────────────────────────────────────────────
const W = 620, H = 400
const FX = 70, FY = 40, FW = 480, FH = 320
const GOAL_H = 90, GOAL_D = 48
const GOAL_L = { x: FX - GOAL_D, y: FY + FH / 2 - GOAL_H / 2, w: GOAL_D, h: GOAL_H }
const GOAL_R = { x: FX + FW,     y: FY + FH / 2 - GOAL_H / 2, w: GOAL_D, h: GOAL_H }
const PLAYER_R = 13, BALL_R = 9
const PLAYER_SPEED = 2.8, BALL_FRICTION = 0.965, KICK_POWER = 6.5
const GAME_DURATION = 90

type Role = 'GK' | 'LB' | 'RB' | 'LW' | 'RW'
interface Player { id: number; team: 'blue'|'red'; role: Role; x: number; y: number; vx: number; vy: number; isUser: boolean }
interface Ball   { x: number; y: number; vx: number; vy: number }
interface Touch  { active: boolean; startX: number; startY: number; dx: number; dy: number }
interface GS {
  players: Player[]; ball: Ball; keys: Set<string>; touch: Touch
  score: { blue: number; red: number }; timeLeft: number; lastGoalTime: number
  animFrame: number | null; timerInterval: ReturnType<typeof setInterval> | null
}

const BLUE_HOME: Record<Role,[number,number]> = {
  GK: [FX+28,        FY+FH/2],
  LB: [FX+110,       FY+FH/2-75],
  RB: [FX+110,       FY+FH/2+75],
  LW: [FX+FW*0.6,    FY+FH/2-75],
  RW: [FX+FW*0.6,    FY+FH/2+75],
}
const RED_HOME: Record<Role,[number,number]> = {
  GK: [FX+FW-28,     FY+FH/2],
  LB: [FX+FW-110,    FY+FH/2+75],
  RB: [FX+FW-110,    FY+FH/2-75],
  LW: [FX+FW*0.4,    FY+FH/2+75],
  RW: [FX+FW*0.4,    FY+FH/2-75],
}

const POSITIONS: { id: Role; name: string; desc: string; emoji: string }[] = [
  { id:'GK', name:'Goalkeeper',     desc:'Guard your goal and make big saves!',      emoji:'🧤' },
  { id:'LB', name:'Left Defender',  desc:'Defend and support from the left side',    emoji:'🛡️' },
  { id:'RB', name:'Right Defender', desc:'Defend and support from the right side',   emoji:'🛡️' },
  { id:'LW', name:'Left Striker',   desc:'Attack and score from the left wing',      emoji:'⚡' },
  { id:'RW', name:'Right Striker',  desc:'Attack and score from the right wing',     emoji:'⚡' },
]

function makePlayers(userRole: Role): Player[] {
  const roles: Role[] = ['GK','LB','RB','LW','RW']
  return [
    ...roles.map((r,i) => ({ id:i,    team:'blue' as const, role:r, x:BLUE_HOME[r][0], y:BLUE_HOME[r][1], vx:0, vy:0, isUser:r===userRole })),
    ...roles.map((r,i) => ({ id:10+i, team:'red'  as const, role:r, x:RED_HOME[r][0],  y:RED_HOME[r][1],  vx:0, vy:0, isUser:false })),
  ]
}

// ── Physics helpers ────────────────────────────────────────────────────────
function steerTo(p: Player, tx: number, ty: number, spd: number) {
  const dx = tx-p.x, dy = ty-p.y, d = Math.hypot(dx,dy)
  if (d < 2) { p.vx=0; p.vy=0; return }
  p.vx = dx/d*spd; p.vy = dy/d*spd
}

function moveUser(gs: GS) {
  const u = gs.players.find(p => p.isUser)!
  let dx=0, dy=0
  if (gs.keys.has('ArrowLeft') || gs.keys.has('a'))  dx -= 1
  if (gs.keys.has('ArrowRight')|| gs.keys.has('d'))  dx += 1
  if (gs.keys.has('ArrowUp')   || gs.keys.has('w'))  dy -= 1
  if (gs.keys.has('ArrowDown') || gs.keys.has('s'))  dy += 1
  if (gs.touch.active) {
    const MAX = 40
    dx += Math.max(-1, Math.min(1, gs.touch.dx / MAX))
    dy += Math.max(-1, Math.min(1, gs.touch.dy / MAX))
  }
  const len = Math.hypot(dx, dy)
  if (len > 0) { u.vx = dx/len*PLAYER_SPEED; u.vy = dy/len*PLAYER_SPEED }
  else { u.vx *= 0.85; u.vy *= 0.85 }
  u.x = Math.max(FX+PLAYER_R, Math.min(FX+FW-PLAYER_R, u.x+u.vx))
  u.y = Math.max(FY+PLAYER_R, Math.min(FY+FH-PLAYER_R, u.y+u.vy))
}

function moveAI(gs: GS) {
  const midX = FX + FW / 2
  for (const p of gs.players) {
    if (p.isUser) continue
    const isBlue = p.team === 'blue'
    const home = isBlue ? BLUE_HOME[p.role] : RED_HOME[p.role]
    const bx = gs.ball.x, by = gs.ball.y
    const dist = Math.hypot(p.x - bx, p.y - by)
    let tx = home[0], ty = home[1]

    if (p.role === 'GK') {
      // Hug goal line, track ball vertically, only charge if ball very close
      tx = isBlue ? FX + 35 : FX + FW - 35
      ty = Math.max(FY + GOAL_H / 2, Math.min(FY + FH - GOAL_H / 2, by))
      if (dist < 75) { tx = bx; ty = by }
    } else if (p.role === 'LB' || p.role === 'RB') {
      // Defenders stay in their defensive half; chase only when ball is in that half and close
      const ballInDefHalf = isBlue ? bx < midX + 60 : bx > midX - 60
      if (ballInDefHalf && dist < 130) {
        tx = bx; ty = by
      } else {
        // Stay home but drift slightly toward ball on y-axis
        tx = home[0]
        ty = home[1] + (by - home[1]) * 0.25
      }
    } else {
      // Strikers (LW/RW): only chase when ball is in offensive half
      const ballInAttHalf = isBlue ? bx > midX - 80 : bx < midX + 80
      if (ballInAttHalf) {
        tx = bx; ty = by
      } else {
        // Hold at home, slight y drift
        tx = home[0]
        ty = home[1] + (by - home[1]) * 0.15
      }
    }

    steerTo(p, tx, ty, PLAYER_SPEED * 0.88)
    p.x = Math.max(FX + PLAYER_R, Math.min(FX + FW - PLAYER_R, p.x + p.vx))
    p.y = Math.max(FY + PLAYER_R, Math.min(FY + FH - PLAYER_R, p.y + p.vy))
  }
}

function moveBall(gs: GS) {
  const b = gs.ball
  const MIN_BOUNCE = 2.0
  if (b.x-BALL_R < FX)    { b.x=FX+BALL_R;    b.vx= Math.max(MIN_BOUNCE, Math.abs(b.vx)*0.75) }
  if (b.x+BALL_R > FX+FW) { b.x=FX+FW-BALL_R; b.vx=-Math.max(MIN_BOUNCE, Math.abs(b.vx)*0.75) }
  if (b.y-BALL_R < FY)    { b.y=FY+BALL_R;    b.vy= Math.max(MIN_BOUNCE, Math.abs(b.vy)*0.75) }
  if (b.y+BALL_R > FY+FH) { b.y=FY+FH-BALL_R; b.vy=-Math.max(MIN_BOUNCE, Math.abs(b.vy)*0.75) }
  for (const p of gs.players) {
    const dx=b.x-p.x, dy=b.y-p.y, d=Math.hypot(dx,dy)
    if (d < PLAYER_R+BALL_R && d > 0) {
      const nx=dx/d, ny=dy/d
      const spd = Math.max(KICK_POWER, Math.hypot(p.vx,p.vy)*1.5+4)
      b.vx=nx*spd; b.vy=ny*spd
      b.x=p.x+nx*(PLAYER_R+BALL_R+2); b.y=p.y+ny*(PLAYER_R+BALL_R+2)
    }
  }
  // Anti-stuck: nudge if nearly motionless
  if (Math.hypot(b.vx,b.vy) < 0.4) {
    b.vx += (Math.random()-0.5)*2.5
    b.vy += (Math.random()-0.5)*2.5
  }
  b.x+=b.vx; b.y+=b.vy; b.vx*=BALL_FRICTION; b.vy*=BALL_FRICTION
}

function checkGoal(gs: GS, onGoal: (team:'blue'|'red', userRole: Role) => void, userRole: Role) {
  const b = gs.ball
  if (b.x-BALL_R < GOAL_L.x+GOAL_L.w && b.y>GOAL_L.y && b.y<GOAL_L.y+GOAL_L.h) {
    gs.lastGoalTime = Date.now()
    gs.score.red++
    gs.players = makePlayers(userRole)
    gs.ball = { x:W/2, y:H/2, vx:0, vy:0 }
    onGoal('red', userRole)
  }
  if (b.x+BALL_R > GOAL_R.x && b.y>GOAL_R.y && b.y<GOAL_R.y+GOAL_R.h) {
    gs.lastGoalTime = Date.now()
    gs.score.blue++
    gs.players = makePlayers(userRole)
    gs.ball = { x:W/2, y:H/2, vx:0, vy:0 }
    onGoal('blue', userRole)
  }
}

// ── Canvas draw ────────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, gs: GS, score:{blue:number,red:number}) {
  ctx.clearRect(0,0,W,H)
  ctx.fillStyle='#1a1040'; ctx.fillRect(0,0,W,H)

  // Field
  ctx.fillStyle='#15803d'
  ctx.beginPath(); (ctx as any).roundRect(FX,FY,FW,FH,4); ctx.fill()

  // Stripes
  ctx.fillStyle='rgba(0,0,0,0.06)'
  for (let i=0;i<6;i++) { ctx.fillRect(FX+i*FW/6, FY, FW/6, FH); i++ }

  // Lines
  ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2
  ctx.strokeRect(FX,FY,FW,FH)
  ctx.beginPath(); ctx.moveTo(FX+FW/2,FY); ctx.lineTo(FX+FW/2,FY+FH); ctx.stroke()
  ctx.beginPath(); ctx.arc(FX+FW/2,FY+FH/2,50,0,Math.PI*2); ctx.stroke()
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fill()
  ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(FX+FW/2,FY+FH/2,3,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='rgba(255,255,255,0.35)'
  ctx.strokeRect(FX,FY+FH/2-70,90,140)
  ctx.strokeRect(FX+FW-90,FY+FH/2-70,90,140)

  // Goals
  const drawGoal = (g:{x:number,y:number,w:number,h:number}, left:boolean) => {
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.strokeStyle='white'; ctx.lineWidth=2.5
    ctx.beginPath()
    if (left) (ctx as any).roundRect(g.x,g.y,g.w,g.h,[4,0,0,4])
    else       (ctx as any).roundRect(g.x,g.y,g.w,g.h,[0,4,4,0])
    ctx.fill(); ctx.stroke()
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=0.8
    for (let i=1;i<4;i++) { const x=g.x+i*g.w/4; ctx.beginPath(); ctx.moveTo(x,g.y); ctx.lineTo(x,g.y+g.h); ctx.stroke() }
    for (let i=1;i<3;i++) { const y=g.y+i*g.h/3; ctx.beginPath(); ctx.moveTo(g.x,y); ctx.lineTo(g.x+g.w,y); ctx.stroke() }
  }
  drawGoal(GOAL_L,true); drawGoal(GOAL_R,false)

  // Team labels
  ctx.font='bold 10px sans-serif'; ctx.textBaseline='top'
  ctx.fillStyle='rgba(147,197,253,0.7)'; ctx.textAlign='left';  ctx.fillText('◀ BLUE (You)', FX+4, FY+5)
  ctx.fillStyle='rgba(252,165,165,0.7)'; ctx.textAlign='right'; ctx.fillText('RED ▶', FX+FW-4, FY+5)

  // Players
  for (const p of gs.players) {
    const col = p.team==='blue' ? '#3b82f6' : '#ef4444'
    const bdr = p.team==='blue' ? '#93c5fd' : '#fca5a5'
    ctx.fillStyle='rgba(0,0,0,0.25)'
    ctx.beginPath(); ctx.ellipse(p.x+2,p.y+PLAYER_R+2,PLAYER_R,4,0,0,Math.PI*2); ctx.fill()
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_R,0,Math.PI*2); ctx.fill()
    ctx.strokeStyle=bdr; ctx.lineWidth=2; ctx.stroke()
    ctx.fillStyle='white'; ctx.font='bold 7px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(p.role,p.x,p.y)

    // Upside-down blue triangle for user
    if (p.isUser) {
      const tx=p.x, ty=p.y-PLAYER_R-16
      ctx.fillStyle='#1d4ed8'; ctx.strokeStyle='#93c5fd'; ctx.lineWidth=1.5
      ctx.beginPath()
      ctx.moveTo(tx, ty+11)     // tip pointing down
      ctx.lineTo(tx-8, ty)      // top-left
      ctx.lineTo(tx+8, ty)      // top-right
      ctx.closePath(); ctx.fill(); ctx.stroke()
    }
  }

  // Ball
  const b=gs.ball
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(b.x+2,b.y+BALL_R,BALL_R*0.8,3,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(b.x,b.y,BALL_R,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='#1f2937'; ctx.lineWidth=1; ctx.stroke()
  ctx.strokeStyle='#374151'; ctx.lineWidth=0.8
  for (let a=0;a<Math.PI*2;a+=Math.PI/3) {
    const bx=b.x+Math.cos(a)*BALL_R*0.5, by=b.y+Math.sin(a)*BALL_R*0.5
    ctx.beginPath(); ctx.arc(bx,by,2.5,0,Math.PI*2); ctx.stroke()
  }

  // Touch joystick
  if (gs.touch.active) {
    const {startX,startY,dx,dy} = gs.touch
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=2
    ctx.fillStyle='rgba(255,255,255,0.08)'
    ctx.beginPath(); ctx.arc(startX,startY,36,0,Math.PI*2); ctx.fill(); ctx.stroke()
    const jx=startX+Math.max(-36,Math.min(36,dx)), jy=startY+Math.max(-36,Math.min(36,dy))
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(jx,jy,14,0,Math.PI*2); ctx.fill()
  }
}

// ── Page component ─────────────────────────────────────────────────────────
export default function SoccerPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'pick'|'play'|'over'>('pick')
  const [userRole, setUserRole] = useState<Role>('LW')
  const [score, setScore] = useState({blue:0, red:0})
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [lastGoal, setLastGoal] = useState<'blue'|'red'|null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef = useRef<GS | null>(null)

  const startGame = useCallback((role: Role) => {
    setUserRole(role); setScore({blue:0,red:0}); setTimeLeft(GAME_DURATION); setLastGoal(null); setPhase('play')
  }, [])

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
    }
    gsRef.current = gs

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
        e.preventDefault(); gs.keys.add(e.key)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => gs.keys.delete(e.key)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

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
    const onTouchEnd = () => { gs.touch = {active:false,startX:0,startY:0,dx:0,dy:0} }
    canvas.addEventListener('touchstart', onTouchStart, {passive:false})
    canvas.addEventListener('touchmove',  onTouchMove,  {passive:false})
    canvas.addEventListener('touchend',   onTouchEnd)

    gs.timerInterval = setInterval(() => {
      if (!gsRef.current) return
      gsRef.current.timeLeft = Math.max(0, gsRef.current.timeLeft-1)
      setTimeLeft(gsRef.current.timeLeft)
      if (gsRef.current.timeLeft <= 0) {
        setScore({...gsRef.current.score}); setPhase('over')
      }
    }, 1000)

    const onGoal = (team: 'blue'|'red') => {
      setScore({...gs.score})
      setLastGoal(team)
      setTimeout(() => setLastGoal(null), 2500)
    }

    const loop = () => {
      const paused = Date.now()-gs.lastGoalTime < 1800
      if (!paused) {
        moveUser(gs); moveAI(gs); moveBall(gs)
        checkGoal(gs, onGoal, userRole)
      }
      draw(ctx, gs, gs.score)
      gs.animFrame = requestAnimationFrame(loop)
    }
    gs.animFrame = requestAnimationFrame(loop)

    return () => {
      if (gs.animFrame) cancelAnimationFrame(gs.animFrame)
      if (gs.timerInterval) clearInterval(gs.timerInterval)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, userRole])

  return (
    <div className="flex flex-col items-center min-h-screen p-4" style={{background:'linear-gradient(135deg,#0f0a2e,#1a1040)'}}>

      {/* Position picker */}
      {phase==='pick' && (
        <div className="w-full max-w-md space-y-4 pt-4">
          <button onClick={() => router.back()} className="text-white/40 text-sm font-semibold hover:text-white transition">← Back</button>
          <div className="text-center space-y-1">
            <div className="text-5xl">⚽</div>
            <h1 className="text-2xl font-black text-white">ScholarBattle Soccer</h1>
            <p className="text-white/50 text-sm">5v5 · Choose your position</p>
          </div>
          <div className="space-y-2">
            {POSITIONS.map(pos => (
              <button key={pos.id} onClick={() => setUserRole(pos.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all ${
                  userRole===pos.id
                    ? 'bg-indigo-500/25 border-indigo-400/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/8'
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
        <div className="w-full max-w-2xl space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setPhase('over')} className="text-white/40 text-xs font-semibold hover:text-white transition">✕ Quit</button>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-blue-400">{score.blue}</span>
              <span className="text-white/30 font-black">—</span>
              <span className="text-2xl font-black text-red-400">{score.red}</span>
            </div>
            <div className={`font-black text-sm px-3 py-1 rounded-full ${timeLeft<=15?'text-red-400 bg-red-400/15':'text-white/60'}`}>
              {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
            </div>
          </div>
          <canvas ref={canvasRef} width={W} height={H}
            className="w-full rounded-2xl touch-none"
            style={{maxHeight:'62vh',objectFit:'contain'}} />
          <div className="flex items-center justify-between px-1">
            <p className="text-white/30 text-xs">WASD / arrow keys · drag on mobile</p>
            {lastGoal && (
              <p className={`text-sm font-black animate-bounce ${lastGoal==='blue'?'text-blue-400':'text-red-400'}`}>
                {lastGoal==='blue'?'🎉 GOAL! You scored!':'😤 Red scores!'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Game over */}
      {phase==='over' && (
        <div className="w-full max-w-sm space-y-5 pt-8 text-center">
          <div className="text-6xl">{score.blue>score.red?'🏆':score.blue===score.red?'🤝':'😤'}</div>
          <h2 className="text-2xl font-black text-white">
            {score.blue>score.red?'You Won!':score.blue===score.red?"It's a Draw!":'Red Wins!'}
          </h2>
          <div className="flex justify-center gap-8">
            <div><p className="text-5xl font-black text-blue-400">{score.blue}</p><p className="text-xs text-white/40 mt-1">Blue (You)</p></div>
            <div className="text-2xl font-black text-white/20 self-center">—</div>
            <div><p className="text-5xl font-black text-red-400">{score.red}</p><p className="text-xs text-white/40 mt-1">Red</p></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => startGame(userRole)}
              className="flex-1 py-3 rounded-2xl font-black text-white text-sm"
              style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>
              🔁 Play Again
            </button>
            <button onClick={() => setPhase('pick')}
              className="flex-1 py-3 rounded-2xl border border-white/15 text-white/70 font-bold text-sm hover:bg-white/5 transition">
              Change Position
            </button>
          </div>
          <button onClick={() => router.back()} className="text-white/30 text-sm hover:text-white transition">Back to Games</button>
        </div>
      )}
    </div>
  )
}

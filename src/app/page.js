'use client';

import { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // overview, leaderboard, rules
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [leaderboardSubView, setLeaderboardSubView] = useState('overall'); // overall, byAlliance
  const [logs, setLogs] = useState([]);
  
  // Stopwatch state for three parallel timers
  const [localRuns, setLocalRuns] = useState({
    A: { elapsedSeconds: 0, isRunning: false, currentElapsed: 0 },
    B: { elapsedSeconds: 0, isRunning: false, currentElapsed: 0 },
    C: { elapsedSeconds: 0, isRunning: false, currentElapsed: 0 }
  });
  const timerRefs = useRef({ A: null, B: null, C: null });

  // Fetch score data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/score');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        
        // Generate simulated telemetry logs based on scores
        generateMockLogs(json);
      }
    } catch (err) {
      console.warn('Ошибка загрузки данных дашборда:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Synchronize local runs whenever server data changes
  useEffect(() => {
    if (data && data.activeRuns) {
      setLocalRuns({
        A: { ...data.activeRuns.A, currentElapsed: data.activeRuns.A.elapsedSeconds || 0 },
        B: { ...data.activeRuns.B, currentElapsed: data.activeRuns.B.elapsedSeconds || 0 },
        C: { ...data.activeRuns.C, currentElapsed: data.activeRuns.C.elapsedSeconds || 0 }
      });
    }
  }, [data]);

  // Client-side stopwatch ticking every second
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setLocalRuns(prev => {
        const next = { ...prev };
        let changed = false;
        ['A', 'B', 'C'].forEach(aid => {
          const run = next[aid];
          if (run && run.isRunning && run.startTime) {
            const start = new Date(run.startTime).getTime();
            const elapsed = (run.elapsedSeconds || 0) + Math.floor((Date.now() - start) / 1000);
            if (run.currentElapsed !== elapsed) {
              run.currentElapsed = elapsed;
              changed = true;
            }
          } else if (run && run.currentElapsed !== (run.elapsedSeconds || 0)) {
            run.currentElapsed = run.elapsedSeconds || 0;
            changed = true;
          }
        });
        return changed ? { ...next } : prev;
      });
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  const formatTimerDisplay = (elapsed) => {
    if (!elapsed || elapsed < 0) return '00:00';
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const generateMockLogs = (currentData) => {
    const newLogs = [];
    const nowStr = () => new Date().toLocaleTimeString();
    
    let anyRunning = false;
    if (currentData.activeRuns) {
      ['A', 'B', 'C'].forEach(aid => {
        const run = currentData.activeRuns[aid];
        if (run && run.isRunning) {
          anyRunning = true;
          const activeTeam = findTeamById(currentData, run.teamId);
          newLogs.push(`[${nowStr()}] ПОЛИГОН ${aid === 'A' ? '1' : aid === 'B' ? '2' : '3'}: Идет заезд команды ${activeTeam?.name || '???'}...`);
        }
      });
    }

    if (!anyRunning) {
      newLogs.push(`[${nowStr()}] SYSTEM: Системы мониторинга готовы. Ожидание запуска судейской панели.`);
    }

    // List top team
    const allTeams = getAllTeamsWithScores(currentData);
    if (allTeams.length > 0 && allTeams[0].score > 0) {
      newLogs.push(`[${nowStr()}] LEADERBOARD: Текущий лидер зачетов — ${allTeams[0].name} с результатом в ${allTeams[0].score} баллов!`);
    }

    setLogs(newLogs.slice(0, 3));
  };

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e1e', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="pulse-indicator"></div>
          <div>Загрузка дашборда эстафеты...</div>
        </div>
      </div>
    );
  }

  // Helpers
  function findTeamById(state, id) {
    for (const allianceId in state.alliances) {
      const team = state.alliances[allianceId].teams.find(t => t.id === id);
      if (team) return { ...team, allianceId };
    }
    return null;
  }

  function getAllTeamsWithScores(state) {
    const list = [];
    for (const allianceId in state.alliances) {
      state.alliances[allianceId].teams.forEach(t => {
        list.push({ ...t, allianceId, allianceName: state.alliances[allianceId].name });
      });
    }
    // Sort by score desc, then by timeSeconds asc (if time > 0)
    return list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeSeconds && b.timeSeconds) return a.timeSeconds - b.timeSeconds;
      return 0;
    });
  }

  // Calculate Alliance Totals
  const allianceA = data.alliances.A;
  const allianceB = data.alliances.B;
  const allianceC = data.alliances.C;

  const allianceA_score = allianceA.teams.reduce((acc, t) => acc + t.score, 0);
  const allianceB_score = allianceB.teams.reduce((acc, t) => acc + t.score, 0);
  const allianceC_score = allianceC.teams.reduce((acc, t) => acc + t.score, 0);

  const allianceA_time = allianceA.teams.reduce((acc, t) => acc + t.timeSeconds, 0);
  const allianceB_time = allianceB.teams.reduce((acc, t) => acc + t.timeSeconds, 0);
  const allianceC_time = allianceC.teams.reduce((acc, t) => acc + t.timeSeconds, 0);

  const alliancesList = [
    { ...allianceA, totalScore: allianceA_score, totalTime: allianceA_time },
    { ...allianceB, totalScore: allianceB_score, totalTime: allianceB_time },
    { ...allianceC, totalScore: allianceC_score, totalTime: allianceC_time }
  ].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.totalTime - b.totalTime;
  });

  const selectedTeam = selectedTeamId ? findTeamById(data, selectedTeamId) : null;

  const formatTime = (totalSecs) => {
    if (!totalSecs) return '0:00';
    const m = Math.floor(totalSecs / 60);
    const s = String(totalSecs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="figma-app">
      {/* Background blobs for IRIT-RTF style */}
      <div className="blob-container">
        <div className="pastel-blob-1"></div>
        <div className="pastel-blob-2"></div>
      </div>
      {/* Top Toolbar */}
      <header className="figma-toolbar">
        <div className="toolbar-left">
          <div className="figma-logo-badge">
            <span style={{ fontSize: '18px', marginRight: '6px' }}>🤖</span>
            <span>Yandex Camp 2026</span>
          </div>
          <div className="toolbar-divider"></div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>
            Финальная робоэстафета
          </div>
        </div>

        <div className="toolbar-center">
          {/* Active stopwatches for 3 Polygons */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {['A', 'B', 'C'].map(aid => {
              const run = localRuns[aid];
              const isRunning = run?.isRunning;
              const elapsed = run?.currentElapsed || 0;
              const team = run?.teamId ? findTeamById(data, run.teamId) : null;
              
              return (
                <div 
                  key={aid} 
                  className="stopwatch-widget" 
                  style={{ 
                    border: '1px solid var(--border-default)',
                    borderColor: isRunning ? (aid === 'A' ? 'var(--alliance-a)' : aid === 'B' ? 'var(--alliance-b)' : 'var(--alliance-c)') : 'var(--border-default)',
                    boxShadow: isRunning ? '0 0 10px rgba(1, 58, 114, 0.08)' : 'none',
                    padding: '4px 12px'
                  }}
                >
                  <span className={isRunning ? "pulse-indicator" : ""} style={{ width: '8px', height: '8px', background: isRunning ? '#0acf83' : '#94a3b8' }}></span>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                      ПОЛИГОН {aid === 'A' ? '1' : aid === 'B' ? '2' : '3'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team ? team.name : 'Свободен'}
                    </span>
                  </div>
                  <div className="stopwatch-time" style={{ fontSize: '14px', marginLeft: '6px' }}>
                    {formatTimerDisplay(elapsed)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="toolbar-right" style={{ gap: '8px' }}>
          <a href="/judge" className="figma-btn" style={{ fontWeight: 'bold' }}>
            🔐 Войти как Судья
          </a>
          <a href="/admin" className="figma-btn primary" style={{ fontWeight: 'bold' }}>
            📁 Администратор
          </a>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="figma-workspace">
        
        {/* Left Sidebar - Pages & Layers */}
        <aside className="figma-sidebar left">
          <div className="sidebar-header">Навигация</div>
          <div className="sidebar-content">
            <div 
              className={`tree-item ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => { setActiveView('overview'); setSelectedTeamId(null); }}
            >
              <div className="tree-item-icon">📊</div>
              <span>Обзор Альянсов</span>
            </div>
            <div 
              className={`tree-item ${activeView === 'leaderboard' ? 'active' : ''}`}
              onClick={() => { setActiveView('leaderboard'); setSelectedTeamId(null); }}
            >
              <div className="tree-item-icon">⚡</div>
              <span>Таблица команд</span>
            </div>
            <div 
              className={`tree-item ${activeView === 'rules' ? 'active' : ''}`}
              onClick={() => { setActiveView('rules'); setSelectedTeamId(null); }}
            >
              <div className="tree-item-icon">📜</div>
              <span>Регламент и правила</span>
            </div>

            <div className="sidebar-header" style={{ marginTop: '16px' }}>Альянсы и команды</div>
            
            {/* Alliance A */}
            <div 
              className="tree-item"
              style={{ color: 'var(--alliance-a)', fontWeight: '600' }}
            >
              <span className="alliance-dot A"></span>
              <span>Мега-Альянс А</span>
            </div>
            {allianceA.teams.map(t => (
              <div 
                key={t.id}
                className={`tree-item indent-1 ${selectedTeamId === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTeamId(t.id)}
              >
                <div className="tree-item-icon">🤖</div>
                <div className="tree-item-meta">
                  <span className="tree-item-name">{t.name}</span>
                  <span className="tree-item-details">rover: #{t.rover} | gfs: #{t.gfsx}</span>
                </div>
                <span className="tree-item-score">{t.score} б.</span>
              </div>
            ))}

            {/* Alliance B */}
            <div 
              className="tree-item"
              style={{ color: 'var(--alliance-b)', fontWeight: '600', marginTop: '8px' }}
            >
              <span className="alliance-dot B"></span>
              <span>Мега-Альянс B</span>
            </div>
            {allianceB.teams.map(t => (
              <div 
                key={t.id}
                className={`tree-item indent-1 ${selectedTeamId === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTeamId(t.id)}
              >
                <div className="tree-item-icon">🤖</div>
                <div className="tree-item-meta">
                  <span className="tree-item-name">{t.name}</span>
                  <span className="tree-item-details">rover: #{t.rover} | gfs: #{t.gfsx}</span>
                </div>
                <span className="tree-item-score">{t.score} б.</span>
              </div>
            ))}

            {/* Alliance C */}
            <div 
              className="tree-item"
              style={{ color: 'var(--alliance-c)', fontWeight: '600', marginTop: '8px' }}
            >
              <span className="alliance-dot C"></span>
              <span>Мега-Альянс C</span>
            </div>
            {allianceC.teams.map(t => (
              <div 
                key={t.id}
                className={`tree-item indent-1 ${selectedTeamId === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTeamId(t.id)}
              >
                <div className="tree-item-icon">🤖</div>
                <div className="tree-item-meta">
                  <span className="tree-item-name">{t.name}</span>
                  <span className="tree-item-details">rover: #{t.rover} | gfs: #{t.gfsx}</span>
                </div>
                <span className="tree-item-score">{t.score} б.</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col min-w-0 relative h-screen">
          <div className="flex-1 overflow-y-auto bg-background bg-notebook relative p-6 md:p-10 z-0">
            {/* Organic Blobs */}
            <div className="organic-blob w-[500px] h-[500px] top-[-100px] left-[-100px]"></div>
            <div className="organic-blob w-[400px] h-[400px] bottom-[-50px] right-[10%] animate-[float_25s_infinite_ease-in-out_alternate-reverse]"></div>
            
            <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-6">
          
          {/* VIEW: OVERVIEW */}
          {activeView === 'overview' && (
            <>
              {/* Alliance Rankings */}
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.3px' }}>
                  🏆 Соревнование Альянсов (Командный зачет)
                </h2>
                <div className="leaderboard-grid">
                  {alliancesList.map((all, idx) => (
                    <div 
                      key={all.id} 
                      className={`stitch-card card-glow-${all.id}`}
                    >
                      <div className="card-title-container">
                        <div className="card-title">
                          <span className={`alliance-dot ${all.id}`}></span>
                          <span>{all.name}</span>
                        </div>
                        <span className="score-badge-inline" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          #{idx + 1}
                        </span>
                      </div>
                      
                      <div className={`alliance-hero-score ${all.id}`}>
                        {all.totalScore} <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--figma-text-secondary)' }}>баллов</span>
                      </div>

                      <div className="flex-between" style={{ fontSize: '12px', color: 'var(--figma-text-secondary)', borderTop: '1px solid var(--figma-border)', paddingTop: '10px', marginTop: '10px' }}>
                        <span>Суммарное время заездов:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#fff' }}>
                          {formatTime(all.totalTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

               {/* Polygon monitors */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                  📡 Статус полигонов и заездов
                </h3>
                <div className="polygon-container">
                  {/* Polygon 1 */}
                  <div className={`polygon-card ${data.activeRuns?.A?.isRunning ? 'active' : ''}`}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Полигон 1 (Мега-Альянс A)</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: 'var(--alliance-a)' }}>
                      {data.activeRuns?.A?.teamId ? findTeamById(data, data.activeRuns.A.teamId)?.name : 'Свободен'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {data.activeRuns?.A?.isRunning ? (
                        <span className="flex-row" style={{ justifyContent: 'center' }}>
                          <span className="pulse-indicator"></span> Идет заезд: {formatTimerDisplay(localRuns.A.currentElapsed)}
                        </span>
                      ) : 'В ожидании'}
                    </div>
                  </div>

                  {/* Polygon 2 */}
                  <div className={`polygon-card ${data.activeRuns?.B?.isRunning ? 'active' : ''}`}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Полигон 2 (Мега-Альянс B)</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: 'var(--alliance-b)' }}>
                      {data.activeRuns?.B?.teamId ? findTeamById(data, data.activeRuns.B.teamId)?.name : 'Свободен'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {data.activeRuns?.B?.isRunning ? (
                        <span className="flex-row" style={{ justifyContent: 'center' }}>
                          <span className="pulse-indicator"></span> Идет заезд: {formatTimerDisplay(localRuns.B.currentElapsed)}
                        </span>
                      ) : 'В ожидании'}
                    </div>
                  </div>

                  {/* Polygon 3 */}
                  <div className={`polygon-card ${data.activeRuns?.C?.isRunning ? 'active' : ''}`}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Полигон 3 (Мега-Альянс C)</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0', color: 'var(--alliance-c)' }}>
                      {data.activeRuns?.C?.teamId ? findTeamById(data, data.activeRuns.C.teamId)?.name : 'Свободен'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {data.activeRuns?.C?.isRunning ? (
                        <span className="flex-row" style={{ justifyContent: 'center' }}>
                          <span className="pulse-indicator"></span> Идет заезд: {formatTimerDisplay(localRuns.C.currentElapsed)}
                        </span>
                      ) : 'В ожидании'}
                    </div>
                  </div>
                </div>
              </div>



              {/* Detailed tables for each Alliance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--figma-text-secondary)' }}>
                  📊 Подробные результаты заездов
                </h3>
                
                {/* Loop Alliances */}
                {['A', 'B', 'C'].map(allianceKey => {
                  const alliance = data.alliances[allianceKey];
                  return (
                    <div key={allianceKey} className="stitch-card" style={{ padding: '16px' }}>
                      <div className="flex-between" style={{ marginBottom: '12px' }}>
                        <div className="flex-row">
                          <span className={`alliance-dot ${allianceKey}`}></span>
                          <span style={{ fontWeight: '700', fontSize: '14px' }}>{alliance.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--figma-text-secondary)' }}>
                          Всего: <b>{alliance.teams.reduce((acc, t) => acc + t.score, 0)} б.</b> | Время: <b>{formatTime(alliance.teams.reduce((acc, t) => acc + t.timeSeconds, 0))}</b>
                        </span>
                      </div>
                      
                      <div className="figma-table-container">
                        <table className="figma-table">
                          <thead>
                            <tr>
                              <th>Команда</th>
                              <th>Ровер (Скаут)</th>
                              <th>GFS-X (Перехват)</th>
                              <th>Поиск мяча (Rover)</th>
                              <th>Цепочка активации</th>
                              <th>Полоса препятствий (GFS)</th>
                              <th>Захват и Возврат</th>
                              <th>Время</th>
                              <th style={{ textAlign: 'right' }}>Итого</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alliance.teams.map(t => (
                              <tr 
                                key={t.id} 
                                style={{ cursor: 'pointer', opacity: t.disqualified ? 0.6 : 1 }}
                                onClick={() => setSelectedTeamId(t.id)}
                              >
                                <td style={{ fontWeight: '600' }}>
                                  {t.name} {t.disqualified && <span style={{ color: '#ff3b30', fontSize: '9px', fontWeight: 'bold' }}>[ДИСКВ.]</span>}
                                </td>
                                <td>#{t.rover}</td>
                                <td>#{t.gfsx}</td>
                                
                                {t.disqualified ? (
                                  <td colSpan="4" style={{ color: '#ff3b30', fontWeight: 'bold', textAlign: 'center', fontSize: '11px' }}>
                                    🚫 Команда дисквалифицирована за нарушение правил
                                  </td>
                                ) : (
                                  <>
                                    <td>
                                      {t.stage1?.skipped ? (
                                        <span style={{ color: 'var(--text-secondary)' }}>Скип (+5 мин)</span>
                                      ) : (
                                        t.stage1.findBall === 'autonomous' ? 'Автономно (+10)' : t.stage1.findBall === 'foxglove' ? 'Foxglove (+5)' : 'Не найден (0)'
                                      )}
                                    </td>
                                    <td>
                                      {t.stage1?.skipped ? (
                                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                      ) : (
                                        t.stage1.activation === 'success' ? 'Сработала (+10)' : 'Вручную (0)'
                                      )}
                                    </td>
                                    <td>
                                      {t.stage2?.skipped ? (
                                        <span style={{ color: 'var(--text-secondary)' }}>Скип (+5 мин)</span>
                                      ) : (
                                        t.stage2.enteredZone ? (
                                          <span>
                                            Зона (+15)
                                            {t.stage2.collisions1 > 0 && ` / -${t.stage2.collisions1 * 3} снос`}
                                          </span>
                                        ) : 'Не доехал (0)'
                                      )}
                                    </td>
                                    <td>
                                      {t.stage2?.skipped ? (
                                        <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                      ) : (
                                        [
                                          t.stage2.autonomous ? 'Автоном (+20)' : null,
                                          t.stage2.catch ? 'Захват (+20)' : null,
                                          t.stage2.returnToStart ? `Возврат (+15${t.stage2.collisions2 > 0 ? ` -${t.stage2.collisions2 * 3} снос` : ''})` : null,
                                          t.stage2.returnWithBall ? 'Мяч (+15)' : null,
                                          t.penalties.resets > 0 ? `Вмешат. (-${t.penalties.resets * 15})` : null
                                        ].filter(Boolean).join(', ') || '—'
                                      )}
                                    </td>
                                  </>
                                )}
                                
                                <td style={{ fontFamily: 'monospace' }}>{formatTime(t.timeSeconds)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: t.disqualified ? '#ff3b30' : 'var(--text-primary)' }}>
                                  {t.disqualified ? '0 б.' : `${t.score} б.`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* VIEW: LIVE LEADERBOARD (INDIVIDUAL RANKINGS) */}
          {activeView === 'leaderboard' && (
            <div className="stitch-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    ⚡ Индивидуальный зачёт роботов
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                    Победитель общего зачёта забирает отдельную номинацию за максимальные баллы на хакатоне.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`figma-btn ${leaderboardSubView === 'overall' ? 'primary' : ''}`}
                    onClick={() => setLeaderboardSubView('overall')}
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                  >
                    🏆 Общий зачёт
                  </button>
                  <button 
                    className={`figma-btn ${leaderboardSubView === 'byAlliance' ? 'primary' : ''}`}
                    onClick={() => setLeaderboardSubView('byAlliance')}
                    style={{ padding: '6px 16px', fontSize: '12px' }}
                  >
                    👥 По Альянсам
                  </button>
                </div>
              </div>

              {leaderboardSubView === 'overall' ? (
                /* Overall flat leaderboard */
                <div className="figma-table-container">
                  <table className="figma-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Место</th>
                        <th>Название команды</th>
                        <th>Альянс</th>
                        <th>Платформа (Ровер / GFS)</th>
                        <th>Поиск мяча</th>
                        <th>Автоном. GFS-X</th>
                        <th>Коллизии</th>
                        <th>Resets (Штраф)</th>
                        <th>Время</th>
                        <th style={{ textAlign: 'right' }}>Баллы</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllTeamsWithScores(data).map((t, idx) => (
                        <tr 
                          key={t.id}
                          className={idx === 0 && t.score > 0 ? 'card-glow-C' : ''}
                          style={{ cursor: 'pointer', background: idx === 0 && t.score > 0 ? 'rgba(255, 204, 0, 0.05)' : '', opacity: t.disqualified ? 0.6 : 1 }}
                          onClick={() => setSelectedTeamId(t.id)}
                        >
                          <td style={{ fontWeight: 'bold', fontSize: '13px', color: idx === 0 && t.score > 0 && !t.disqualified ? 'var(--alliance-c)' : 'var(--text-secondary)' }}>
                            #{idx + 1} {idx === 0 && t.score > 0 && !t.disqualified ? '👑' : ''}
                          </td>
                          <td style={{ fontWeight: '600', fontSize: '13px' }}>
                            {t.name} {t.disqualified && <span style={{ color: '#ff3b30', fontSize: '9px', fontWeight: 'bold' }}>[ДИСКВ.]</span>}
                          </td>
                          <td>
                            <span className={`alliance-dot ${t.allianceId}`}></span> {t.allianceName}
                          </td>
                          <td>
                            Rover: <b>{t.rover}</b> / GFS: <b>{t.gfsx}</b>
                          </td>
                          
                          {t.disqualified ? (
                            <td colSpan="4" style={{ color: '#ff3b30', fontWeight: 'bold', textAlign: 'center' }}>
                              🚫 Команда дисквалифицирована
                            </td>
                          ) : (
                            <>
                              <td>
                                {t.stage1?.skipped ? 'Скип (+5м)' : (t.stage1.findBall === 'autonomous' ? 'Автономно (+10)' : t.stage1.findBall === 'foxglove' ? 'Foxglove (+5)' : 'Не найден (0)')}
                              </td>
                              <td>
                                {t.stage2?.skipped ? 'Скип (+5м)' : (t.stage2.autonomous ? 'Да (+20)' : 'Нет (0)')}
                              </td>
                              <td>
                                {t.stage2?.skipped ? '—' : `${(t.stage2.collisions1 || 0) + (t.stage2.collisions2 || 0)} снос`}
                              </td>
                              <td style={{ color: t.penalties.resets > 0 ? '#ff3b30' : 'var(--text-secondary)' }}>
                                {t.penalties.resets > 0 ? `-${t.penalties.resets * 15} (${t.penalties.resets} шт)` : '0'}
                              </td>
                            </>
                          )}
                          
                          <td style={{ fontFamily: 'monospace' }}>{formatTime(t.timeSeconds)}</td>
                          <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '14px', color: t.disqualified ? '#ff3b30' : (idx === 0 && t.score > 0 ? 'var(--alliance-c)' : 'var(--text-primary)') }}>
                            {t.disqualified ? '0 б.' : `${t.score} б.`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Grouped by Alliance lists */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {['A', 'B', 'C'].map(aid => {
                    const alliance = data.alliances[aid];
                    const allianceColor = aid === 'A' ? 'var(--alliance-a)' : aid === 'B' ? 'var(--alliance-b)' : 'var(--alliance-c)';
                    const allianceTitle = aid === 'A' ? '🔴 Мега-Альянс А' : aid === 'B' ? '🔵 Мега-Альянс B' : '🟡 Мега-Альянс C';
                    
                    // Sort teams within this alliance by score descending, then by time ascending
                    const sortedTeams = [...alliance.teams].sort((x, y) => {
                      if (x.score !== y.score) return y.score - x.score;
                      return x.timeSeconds - y.timeSeconds;
                    });

                    return (
                      <div key={aid} style={{ borderLeft: `4px solid ${allianceColor}`, paddingLeft: '16px' }}>
                        <h3 style={{ fontWeight: '800', color: allianceColor, fontSize: '14px', marginBottom: '10px' }}>
                          {allianceTitle}
                        </h3>
                        <div className="figma-table-container">
                          <table className="figma-table">
                            <thead>
                              <tr>
                                <th style={{ width: '60px' }}>Место</th>
                                <th>Название команды</th>
                                <th>Платформа (Ровер / GFS)</th>
                                <th>Поиск мяча</th>
                                <th>Автоном. GFS-X</th>
                                <th>Коллизии</th>
                                <th>Штрафы (Resets)</th>
                                <th>Время</th>
                                <th style={{ textAlign: 'right' }}>Баллы</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedTeams.map((t, idx) => (
                                <tr 
                                  key={t.id} 
                                  style={{ cursor: 'pointer', opacity: t.disqualified ? 0.6 : 1 }}
                                  onClick={() => setSelectedTeamId(t.id)}
                                >
                                  <td style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                                    #{idx + 1}
                                  </td>
                                  <td style={{ fontWeight: '600' }}>
                                    {t.name} {t.disqualified && <span style={{ color: '#ff3b30', fontSize: '9px', fontWeight: 'bold' }}>[ДИСКВ.]</span>}
                                  </td>
                                  <td>Rover: #{t.rover} | GFS: #{t.gfsx}</td>
                                  
                                  {t.disqualified ? (
                                    <td colSpan="4" style={{ color: '#ff3b30', fontWeight: 'bold', textAlign: 'center' }}>
                                      🚫 Команда дисквалифицирована
                                    </td>
                                  ) : (
                                    <>
                                      <td>
                                        {t.stage1?.skipped ? 'Скип (+5м)' : (t.stage1.findBall === 'autonomous' ? 'Автономно (+10)' : t.stage1.findBall === 'foxglove' ? 'Foxglove (+5)' : 'Не найден (0)')}
                                      </td>
                                      <td>{t.stage2?.skipped ? 'Скип (+5м)' : (t.stage2.autonomous ? 'Да (+20)' : 'Нет (0)')}</td>
                                      <td>{t.stage2?.skipped ? '—' : `${(t.stage2.collisions1 || 0) + (t.stage2.collisions2 || 0)} снос`}</td>
                                      <td style={{ color: t.penalties.resets > 0 ? '#ff3b30' : 'var(--text-secondary)' }}>
                                        {t.penalties.resets > 0 ? `-${t.penalties.resets * 15} (${t.penalties.resets})` : '0'}
                                      </td>
                                    </>
                                  )}
                                  
                                  <td style={{ fontFamily: 'monospace' }}>{formatTime(t.timeSeconds)}</td>
                                  <td style={{ textAlign: 'right', fontWeight: '800', color: t.disqualified ? '#ff3b30' : 'var(--text-primary)' }}>
                                    {t.disqualified ? '0 б.' : `${t.score} б.`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: RULES */}
          {activeView === 'rules' && (
            <div className="stitch-card" style={{ padding: '24px', lineHeight: '1.6' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>
                📜 Регламент заездов и начисление баллов
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--figma-blue)' }}>
                    ⏱ Общие лимиты времени
                  </h3>
                  <p style={{ color: 'var(--figma-text-secondary)' }}>
                    На попытку каждой команды дается ровно <b>5 минут</b>. 
                    Этап 1 (Яндекс.Ровер) лимитирован <b>2 минутами</b>. В случае успеха или окончания таймаута Ровера, остаток времени переходит на Этап 2 (гусеничный манипулятор GFS-X).
                  </p>
                </div>

                <div className="figma-table-container">
                  <table className="figma-table">
                    <thead>
                      <tr>
                        <th>Действие</th>
                        <th>Условие</th>
                        <th style={{ textAlign: 'right' }}>Баллы</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: '600' }}>Этап 1: Яндекс.Ровер (5 минут на оба этапа)</td>
                        <td>Доезд до мяча на автономной навигации</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+10</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Доезд до мяча по целевой точке в Foxglove (ручная отправка 2D Goal Pose)</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+5</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>{"Цепочка активации через VLM (Фото -> Qwen -> JSON -> Unity -> Старт GFS-X)"}</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+10</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '600' }}>Этап 2: Гусеничный робот GFS-X</td>
                        <td>Движение на обученной нейросети (RL/ONNX) или автокоде (WASD запрещен)</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+20</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Въезд в зону с мячом (полоса препятствий)</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+15</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Столкновение с коробкой/ограждением на пути к мячу (вычитается только из zone)</td>
                        <td style={{ textAlign: 'right', color: '#ff3b30' }}>-3 за каждое</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Захват мяча в клешню и её закрытие (фиксация по ИК-датчику)</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+20</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Успешный возврат в стартовую зону</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+15</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Столкновение с коробкой/ограждением на обратном пути (вычитается только из return)</td>
                        <td style={{ textAlign: 'right', color: '#ff3b30' }}>-3 за каждое</td>
                      </tr>
                      <tr>
                        <td></td>
                        <td>Возврат с удержанием мяча в клешне до финиша</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-green)' }}>+15</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: '600' }}>Общие штрафы</td>
                        <td>Ручное вмешательство при застревании / перенос робота судьями</td>
                        <td style={{ textAlign: 'right', color: '#ff3b30' }}>-15 за каждое</td>
                      </tr>
                      <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <td>Итоговый максимум команды</td>
                        <td>Полное автоматическое прохождение эстафеты</td>
                        <td style={{ textAlign: 'right', color: 'var(--figma-yellow)' }}>105 баллов</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#ff3b30' }}>
                    ⚠️ Критические правила и запреты
                  </h3>
                  <ul style={{ paddingLeft: '20px', color: 'var(--figma-text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                      <b>Запрещено любое воздействие на чужой полигон</b> (физическое, сетевое и т.д.) — <b>дисквалификация всего альянса</b>.
                    </li>
                    <li>
                      Точка в Foxglove ставится ровно <b>один раз</b>. Корректировать её после старта попытки нельзя.
                    </li>
                    <li>
                      При застревании робота судья переносит его на свободную точку с вычетом 15 баллов. Время при этом не останавливается.
                    </li>
                    <li>
                      В случае равенства баллов у альянсов побеждает тот союз, суммарное время заездов которого меньше.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer style={{ 
            marginTop: '48px', 
            paddingTop: '20px', 
            borderTop: '1px solid var(--border-default)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            fontSize: '11px', 
            color: 'var(--text-secondary)',
            width: '100%',
            opacity: 0.8
          }}>
            <div>
              🤖 <b>Yandex Camp 2026</b> · Финальная робоэстафета
            </div>
            <div>
              ИРИТ-РТФ & УрФУ · Все права защищены
            </div>
          </footer>
          </div>
        </div>
      </main>

        {/* Slide-over Drawer Overlay (Sleek UX modal replacing right sidebar) */}
        {selectedTeam && (
          <div className="drawer-backdrop" onClick={() => setSelectedTeamId(null)}>
            <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
              <div className="sidebar-header flex justify-between items-center" style={{ width: '100%' }}>
                <span>Свойства: {selectedTeam.name}</span>
                <button 
                  onClick={() => setSelectedTeamId(null)} 
                  className="text-secondary hover:text-primary" 
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
              <div className="sidebar-content" style={{ padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Альянс</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: selectedTeam.allianceId === 'A' ? 'var(--alliance-a)' : selectedTeam.allianceId === 'B' ? 'var(--alliance-b)' : 'var(--alliance-c)' }}>
                    {selectedTeam.allianceId === 'A' ? '🔴 Мега-Альянс А' : selectedTeam.allianceId === 'B' ? '🔵 Мега-Альянс B' : '🟡 Мега-Альянс C'}
                  </div>
                </div>

                <div className="flex justify-between" style={{ marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ровер ID</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>#{selectedTeam.rover}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>GFS-X ID</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>#{selectedTeam.gfsx}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-default)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Сумма баллов</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-brand-blue)' }}>
                    {selectedTeam.score} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 105</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Время заезда: {formatTime(selectedTeam.timeSeconds)}
                  </div>
                </div>

                {selectedTeam.disqualified ? (
                  <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #ff3b30', background: 'rgba(255,59,48,0.05)', color: '#ff3b30', textAlign: 'center', fontWeight: 'bold', marginBottom: '16px' }}>
                    ⚠️ ДИСКВАЛИФИКАЦИЯ
                    <div style={{ fontSize: '10px', fontWeight: 'normal', marginTop: '4px', color: 'var(--text-secondary)' }}>
                      Команда дисквалифицирована за нарушение регламента (воздействие на чужой полигон).
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Score Checklist details */}
                    <div className="property-section" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--border-default)' }}>
                      <div className="property-title">Этап 1: Яндекс.Ровер</div>
                      {selectedTeam.stage1?.skipped ? (
                        <div style={{ padding: '8px 12px', background: 'rgba(255,59,48,0.05)', color: '#ff3b30', border: '1px dashed #ff3b30', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                          ⚠️ Этап 1 пропущен (+5 минут штрафа)
                        </div>
                      ) : (
                        <ul className="checklist-view">
                          <li className={`checklist-view-item ${selectedTeam.stage1.findBall !== 'failed' ? 'checked' : ''}`}>
                            <span className="item-text">Поиск мяча</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage1.findBall === 'autonomous' ? '+10' : selectedTeam.stage1.findBall === 'foxglove' ? '+5' : '0'}
                            </span>
                          </li>
                          <li className={`checklist-view-item ${selectedTeam.stage1.activation === 'success' ? 'checked' : ''}`}>
                            <span className="item-text">M2M Активация</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage1.activation === 'success' ? '+10' : '0'}
                            </span>
                          </li>
                        </ul>
                      )}
                    </div>

                    <div className="property-section" style={{ padding: '12px 0', borderBottom: 'none' }}>
                      <div className="property-title">Этап 2: Робот GFS-X</div>
                      {selectedTeam.stage2?.skipped ? (
                        <div style={{ padding: '8px 12px', background: 'rgba(255,59,48,0.05)', color: '#ff3b30', border: '1px dashed #ff3b30', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                          ⚠️ Этап 2 пропущен (+5 минут штрафа)
                        </div>
                      ) : (
                        <ul className="checklist-view">
                          <li className={`checklist-view-item ${selectedTeam.stage2.autonomous ? 'checked' : ''}`}>
                            <span className="item-text">Автономное движение</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage2.autonomous ? '+20' : '0'}
                            </span>
                          </li>
                          <li className={`checklist-view-item ${selectedTeam.stage2.enteredZone ? 'checked' : ''}`}>
                            <span className="item-text">Въезд в зону с мячом</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage2.enteredZone ? `+${Math.max(0, 15 - selectedTeam.stage2.collisions1 * 3)}` : '0'}
                            </span>
                          </li>
                          {selectedTeam.stage2.collisions1 > 0 && (
                            <li className="checklist-view-item">
                              <span className="item-text" style={{ color: '#ff3b30' }}>Столкновения (Фаза 1)</span>
                              <span className="score-badge-inline minus">-{selectedTeam.stage2.collisions1 * 3}</span>
                            </li>
                          )}
                          <li className={`checklist-view-item ${selectedTeam.stage2.catch ? 'checked' : ''}`}>
                            <span className="item-text">Захват мяча клешнёй</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage2.catch ? '+20' : '0'}
                            </span>
                          </li>
                          <li className={`checklist-view-item ${selectedTeam.stage2.returnToStart ? 'checked' : ''}`}>
                            <span className="item-text">Возврат на старт</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage2.returnToStart ? `+${Math.max(0, 15 - selectedTeam.stage2.collisions2 * 3)}` : '0'}
                            </span>
                          </li>
                          {selectedTeam.stage2.collisions2 > 0 && (
                            <li className="checklist-view-item">
                              <span className="item-text" style={{ color: '#ff3b30' }}>Столкновения (Фаза 2)</span>
                              <span className="score-badge-inline minus">-{selectedTeam.stage2.collisions2 * 3}</span>
                            </li>
                          )}
                          <li className={`checklist-view-item ${selectedTeam.stage2.returnWithBall ? 'checked' : ''}`}>
                            <span className="item-text">Доставка мяча к кубу</span>
                            <span className="score-badge-inline plus">
                              {selectedTeam.stage2.returnWithBall ? '+15' : '0'}
                            </span>
                          </li>
                          {selectedTeam.penalties.resets > 0 && (
                            <li className="checklist-view-item" style={{ borderColor: 'rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.03)' }}>
                              <span className="item-text" style={{ color: '#ff3b30', fontWeight: 'bold' }}>Вмешательство (x{selectedTeam.penalties.resets})</span>
                              <span className="score-badge-inline minus">-{selectedTeam.penalties.resets * 15}</span>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';

export default function JudgeConsole() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState(null); // 'judge' or 'admin'
  const [selectedAlliance, setSelectedAlliance] = useState(''); // 'A', 'B', 'C'
  const [data, setData] = useState(null);
  
  // Selection of team within the locked alliance
  const [selectedTeamId, setSelectedTeamId] = useState('');
  
  // Form fields for the selected team
  const [findBall, setFindBall] = useState('failed'); // failed, autonomous, foxglove
  const [activation, setActivation] = useState('manual'); // manual, success
  const [stage1Skipped, setStage1Skipped] = useState(false);
  
  const [stage2Autonomous, setStage2Autonomous] = useState(false);
  const [enteredZone, setEnteredZone] = useState(false);
  const [collisions1, setCollisions1] = useState(0);
  const [gfsxCatch, setGfsxCatch] = useState(false);
  const [returnToStart, setReturnToStart] = useState(false);
  const [collisions2, setCollisions2] = useState(0);
  const [returnWithBall, setReturnWithBall] = useState(false);
  const [stage2Skipped, setStage2Skipped] = useState(false);
  
  const [resets, setResets] = useState(0);
  const [timeMin, setTimeMin] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [disqualified, setDisqualified] = useState(false);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState(null);

  // In-line UI confirmations
  const [confirmResetTimer, setConfirmResetTimer] = useState(false);
  const [confirmSwitchAlliance, setConfirmSwitchAlliance] = useState(false);
  const [confirmResetDb, setConfirmResetDb] = useState(false);
  const [confirmDisqualify, setConfirmDisqualify] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Status message
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Local active timer (for the active stopwatch controls)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerIntervalRef = useRef(null);

  // Auth check on mount
  useEffect(() => {
    const saved = localStorage.getItem('yacamp_passcode');
    const savedAlliance = localStorage.getItem('yacamp_judge_alliance');
    
    if (saved) {
      setPasscode(saved);
      checkPasscode(saved, savedAlliance);
    }
  }, []);

  const checkPasscode = async (code, allianceToSet = null) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code })
      });
      if (res.ok) {
        const json = await res.json();
        setIsAuthenticated(true);
        setAuthRole(json.role);
        localStorage.setItem('yacamp_passcode', code);
        
        if (allianceToSet) {
          setSelectedAlliance(allianceToSet);
        }
        
        // Initial fetch
        fetchData(code, allianceToSet);
      } else {
        localStorage.removeItem('yacamp_passcode');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Ошибка авторизации:', err);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!passcode) return;
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const json = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        setAuthRole(json.role);
        localStorage.setItem('yacamp_passcode', passcode);
        showStatus('Авторизация успешна!', 'success');
        fetchData(passcode, selectedAlliance);
      } else {
        showStatus(json.error || 'Неверный ключ доступа', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('yacamp_passcode');
    localStorage.removeItem('yacamp_judge_alliance');
    setIsAuthenticated(false);
    setSelectedAlliance('');
    setSelectedTeamId('');
    setData(null);
    setConfirmLogout(false);
  };

  const handleAllianceSelect = (alliance) => {
    setSelectedAlliance(alliance);
    localStorage.setItem('yacamp_judge_alliance', alliance);
    setSelectedTeamId('');
  };

  const handleSwitchAlliance = () => {
    setSelectedAlliance('');
    localStorage.removeItem('yacamp_judge_alliance');
    setSelectedTeamId('');
    setIsTimerRunning(false);
    setElapsed(0);
    setConfirmSwitchAlliance(false);
  };

  const fetchData = async (codeToCheck = passcode, allianceToCheck = selectedAlliance) => {
    try {
      const res = await fetch('/api/score');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        
        // If an alliance is selected, sync the stopwatch
        if (allianceToCheck && json.activeRuns?.[allianceToCheck]) {
          const run = json.activeRuns[allianceToCheck];
          if (run.isRunning) {
            setIsTimerRunning(true);
            const start = new Date(run.startTime).getTime();
            const base = run.elapsedSeconds || 0;
            setElapsed(base + Math.floor((Date.now() - start) / 1000));
          } else {
            setIsTimerRunning(false);
            setElapsed(run.elapsedSeconds || 0);
          }
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    }
  };

  // Sync state with server periodically
  useEffect(() => {
    if (!isAuthenticated || !selectedAlliance) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, selectedAlliance]);

  // Local timer ticking
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const findTeamById = (id) => {
    if (!data) return null;
    for (const allianceId in data.alliances) {
      const team = data.alliances[allianceId].teams.find(t => t.id === id);
      if (team) return team;
    }
    return null;
  };

  // Drag and Drop sidebar ordering
  const moveTeam = async (id, targetIdx) => {
    if (!data || targetIdx < 0 || targetIdx >= teams.length) return;
    
    const orderedTeamIds = teams.map(t => t.id);
    const currentIdx = orderedTeamIds.indexOf(id);
    if (currentIdx === -1) return;
    
    orderedTeamIds.splice(currentIdx, 1);
    orderedTeamIds.splice(targetIdx, 0, id);
    
    // Optimistic local state update
    const rearrangedTeams = orderedTeamIds.map(tid => teams.find(t => t.id === tid));
    const updatedData = { ...data };
    updatedData.alliances[selectedAlliance].teams = rearrangedTeams;
    setData(updatedData);
    
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'reorderTeams',
          allianceId: selectedAlliance,
          orderedTeamIds
        })
      });
      if (res.ok) {
        showStatus('Порядок команд обновлен!', 'success');
        fetchData();
      } else {
        showStatus('Не удалось сохранить новый порядок на сервере', 'error');
      }
    } catch (err) {
      showStatus('Ошибка сети: ' + err.message, 'error');
    }
  };

  // Auto select first team of selected alliance on load
  useEffect(() => {
    if (data && selectedAlliance) {
      const teams = data.alliances[selectedAlliance].teams;
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [selectedAlliance, data]);

  // Load team data into form when selected team changes
  useEffect(() => {
    if (!data || !selectedTeamId) return;
    const team = findTeamById(selectedTeamId);
    if (!team) return;

    setFindBall(team.stage1.findBall);
    setActivation(team.stage1.activation);
    setStage1Skipped(team.stage1.skipped || false);

    setStage2Autonomous(team.stage2.autonomous || false);
    setEnteredZone(team.stage2.enteredZone || false);
    setCollisions1(team.stage2.collisions1 || 0);
    setGfsxCatch(team.stage2.catch || false);
    setReturnToStart(team.stage2.returnToStart || false);
    setCollisions2(team.stage2.collisions2 || 0);
    setReturnWithBall(team.stage2.returnWithBall || false);
    setStage2Skipped(team.stage2.skipped || false);

    setResets(team.penalties.resets || 0);
    setDisqualified(team.disqualified || false);
    
    // Deconstruct and show unpenalized entered time components
    let baseTime = team.timeSeconds || 0;
    if (team.stage1.skipped) baseTime = Math.max(0, baseTime - 300);
    if (team.stage2.skipped) baseTime = Math.max(0, baseTime - 300);

    const min = Math.floor(baseTime / 60);
    const sec = baseTime % 60;
    setTimeMin(min);
    setTimeSec(sec);

    setConfirmDisqualify(false);
  }, [selectedTeamId]);

  const showStatus = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Live Score Calculator
  const calculateLiveScore = () => {
    if (disqualified) return 0;

    let s1 = 0;
    if (!stage1Skipped) {
      if (findBall === 'autonomous') s1 += 10;
      else if (findBall === 'foxglove') s1 += 5;
      if (activation === 'success') s1 += 10;
    }

    let s2 = 0;
    if (!stage2Skipped) {
      if (stage2Autonomous) s2 += 20;
      if (enteredZone) {
        s2 += Math.max(0, 15 - (collisions1 * 3));
      }
      if (gfsxCatch) s2 += 20;
      if (returnToStart) {
        s2 += Math.max(0, 15 - (collisions2 * 3));
      }
      if (returnWithBall) s2 += 15;
    }

    const total = s1 + s2 - (resets * 15);
    return Math.max(0, total);
  };

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    // Calculate final time: base input seconds + skips (300 sec each)
    let totalSeconds = (parseInt(timeMin) * 60) + parseInt(timeSec);
    if (stage1Skipped) totalSeconds += 300;
    if (stage2Skipped) totalSeconds += 300;
    totalSeconds = Math.min(600, totalSeconds);

    const updatedTeam = {
      ...findTeamById(selectedTeamId),
      timeSeconds: totalSeconds,
      disqualified,
      stage1: { 
        findBall: stage1Skipped ? 'failed' : findBall, 
        activation: stage1Skipped ? 'manual' : activation, 
        skipped: stage1Skipped 
      },
      stage2: {
        autonomous: stage2Skipped ? false : stage2Autonomous,
        enteredZone: stage2Skipped ? false : enteredZone,
        collisions1: stage2Skipped ? 0 : parseInt(collisions1),
        catch: stage2Skipped ? false : gfsxCatch,
        returnToStart: stage2Skipped ? false : returnToStart,
        collisions2: stage2Skipped ? 0 : parseInt(collisions2),
        returnWithBall: stage2Skipped ? false : returnWithBall,
        skipped: stage2Skipped
      },
      penalties: { resets: parseInt(resets) }
    };

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'updateTeam',
          allianceId: selectedAlliance,
          teamId: selectedTeamId,
          team: updatedTeam
        })
      });

      const json = await res.json();
      if (res.ok) {
        showStatus('Результаты ведомости сохранены успешно!', 'success');
        fetchData(); // reload
      } else {
        showStatus(json.error || 'Ошибка сохранения ведомости', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  // Active Timer API Controls
  const handleStartTimer = async () => {
    if (!selectedTeamId) return;
    
    const newActiveRun = {
      teamId: selectedTeamId,
      startTime: new Date().toISOString(),
      isRunning: true,
      elapsedSeconds: 0
    };

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'updateActiveRun',
          allianceId: selectedAlliance,
          activeRun: newActiveRun
        })
      });

      if (res.ok) {
        setIsTimerRunning(true);
        setElapsed(0);
        showStatus('Таймер запущен на дашборде!', 'success');
      } else {
        const json = await res.json();
        showStatus(json.error || 'Ошибка запуска таймера', 'error');
      }
    } catch (err) {
      showStatus(err.message, 'error');
    }
  };

  const handlePauseTimer = async () => {
    const newActiveRun = {
      teamId: selectedTeamId,
      startTime: null,
      isRunning: false,
      elapsedSeconds: elapsed
    };

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'updateActiveRun',
          allianceId: selectedAlliance,
          activeRun: newActiveRun
        })
      });

      if (res.ok) {
        setIsTimerRunning(false);
        showStatus('Таймер приостановлен!', 'success');
      }
    } catch (err) {
      showStatus(err.message, 'error');
    }
  };

  const handleResetTimer = async () => {
    const newActiveRun = {
      teamId: null,
      startTime: null,
      isRunning: false,
      elapsedSeconds: 0
    };

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'updateActiveRun',
          allianceId: selectedAlliance,
          activeRun: newActiveRun
        })
      });

      if (res.ok) {
        setIsTimerRunning(false);
        setElapsed(0);
        showStatus('Таймер успешно обнулен!', 'success');
        setConfirmResetTimer(false);
      }
    } catch (err) {
      showStatus(err.message, 'error');
    }
  };

  // Helper to copy current timer elapsed value directly to team scoresheet inputs
  const handleCopyTimerToForm = () => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    setTimeMin(mins);
    setTimeSec(secs);
    showStatus('Время скопировано в форму!', 'success');
  };

  const handleResetDatabase = async () => {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({ action: 'resetDb' })
      });

      if (res.ok) {
        showStatus('База данных успешно очищена!', 'success');
        setConfirmResetDb(false);
        fetchData();
      } else {
        const json = await res.json();
        showStatus(json.error || 'Ошибка очистки БД', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  const formatTimerDisplay = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ========================================================
  // VIEW 1: Login Gate Screen
  // ========================================================
  if (!isAuthenticated) {
    return (
      <div className="auth-wall-container">
        <div className="organic-blob w-[400px] h-[400px] top-[-100px] left-[-100px]"></div>
        
        <form className="auth-card" onSubmit={handleLoginSubmit}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Консоль Судейства эстафеты
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Авторизуйтесь, чтобы управлять секундомером и отправлять баллы.
          </p>

          {message.text && (
            <div style={{ 
              padding: '10px', 
              borderRadius: '6px', 
              backgroundColor: 'rgba(242,60,39,0.1)', 
              color: '#f23c27', 
              fontSize: '12px', 
              fontWeight: '600', 
              marginBottom: '16px' 
            }}>
              {message.text}
            </div>
          )}

          <div className="figma-group" style={{ textAlign: 'left' }}>
            <label className="figma-label">Ключ доступа</label>
            <input 
              type="password"
              className="figma-input text-center"
              style={{ fontSize: '18px', letterSpacing: '4px', height: '44px' }}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="figma-btn primary w-full mt-8" 
            style={{ height: '44px', fontSize: '13px', fontWeight: 'bold' }}
          >
            Подтвердить вход
          </button>
        </form>
      </div>
    );
  }

  // ========================================================
  // VIEW 2: Polygon Isolation Choice
  // ========================================================
  if (!selectedAlliance) {
    return (
      <div className="auth-wall-container">
        <div className="organic-blob w-[400px] h-[400px] bottom-[-100px] right-[-100px]"></div>
        
        <div className="auth-card" style={{ width: '450px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Выберите полигон судейства
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Каждый полигон работает с конкретным альянсом команд. Выберите свой:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="figma-btn w-full justify-between" 
              style={{ height: '54px', fontSize: '14px', borderLeft: '6px solid var(--alliance-a)', padding: '0 20px' }}
              onClick={() => handleAllianceSelect('A')}
            >
              <span style={{ fontWeight: 'bold' }}>Полигон 1 (Мега-Альянс А)</span>
              <span className="score-badge-inline" style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--alliance-a)' }}>Красный</span>
            </button>

            <button 
              className="figma-btn w-full justify-between" 
              style={{ height: '54px', fontSize: '14px', borderLeft: '6px solid var(--alliance-b)', padding: '0 20px' }}
              onClick={() => handleAllianceSelect('B')}
            >
              <span style={{ fontWeight: 'bold' }}>Полигон 2 (Мега-Альянс B)</span>
              <span className="score-badge-inline" style={{ background: 'rgba(0, 122, 255, 0.1)', color: 'var(--alliance-b)' }}>Синий</span>
            </button>

            <button 
              className="figma-btn w-full justify-between" 
              style={{ height: '54px', fontSize: '14px', borderLeft: '6px solid var(--alliance-c)', padding: '0 20px' }}
              onClick={() => handleAllianceSelect('C')}
            >
              <span style={{ fontWeight: 'bold' }}>Полигон 3 (Мега-Альянс C)</span>
              <span className="score-badge-inline" style={{ background: 'rgba(255, 204, 0, 0.15)', color: 'var(--alliance-c)' }}>Желтый</span>
            </button>
          </div>

          <div className="toolbar-divider" style={{ width: '100%', margin: '24px 0', height: '1px' }}></div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {!confirmLogout ? (
              <button 
                className="figma-btn danger w-full"
                onClick={() => setConfirmLogout(true)}
                style={{ height: '40px', fontWeight: 'bold' }}
              >
                Выйти из учетной записи
              </button>
            ) : (
              <div className="flex-row w-full">
                <button className="figma-btn danger w-full" onClick={handleLogout} style={{ height: '40px', fontWeight: 'bold' }}>
                  ✔ Да, выйти
                </button>
                <button className="figma-btn w-full" onClick={() => setConfirmLogout(false)} style={{ height: '40px' }}>
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 3: Main Active Judge Console
  // ========================================================
  const teams = data ? data.alliances[selectedAlliance].teams : [];
  const currentTeam = selectedTeamId ? findTeamById(selectedTeamId) : null;
  const polyNum = selectedAlliance === 'A' ? '1' : selectedAlliance === 'B' ? '2' : '3';
  const allianceColor = selectedAlliance === 'A' ? 'var(--alliance-a)' : selectedAlliance === 'B' ? 'var(--alliance-b)' : 'var(--alliance-c)';
  const allianceName = selectedAlliance === 'A' ? 'Мега-Альянс А' : selectedAlliance === 'B' ? 'Мега-Альянс B' : 'Мега-Альянс C';

  return (
    <div className="figma-app">
      {/* Top Toolbar */}
      <header className="figma-toolbar">
        <div className="toolbar-left">
          <span className="figma-logo-badge" style={{ fontWeight: 'bold' }}>
            <span style={{ fontSize: '18px', marginRight: '6px' }}>🔐</span>
            <span>Полигон {polyNum} · Судья</span>
          </span>
          <div className="toolbar-divider"></div>
          <span className="score-badge-inline" style={{ background: 'var(--bg-canvas)', color: allianceColor, fontWeight: '800', border: `1px solid ${allianceColor}` }}>
            {allianceName}
          </span>
        </div>

        <div className="toolbar-right" style={{ gap: '10px' }}>
          <a href="/" className="figma-btn" style={{ fontWeight: 'bold' }}>
            📊 На дашборд
          </a>
          
          {!confirmSwitchAlliance ? (
            <button className="figma-btn" onClick={() => setConfirmSwitchAlliance(true)} style={{ fontWeight: 'bold' }}>
              🔄 Сменить полигон
            </button>
          ) : (
            <div className="flex-row">
              <button className="figma-btn primary" onClick={handleSwitchAlliance} style={{ padding: '6px 12px', fontSize: '12px' }}>
                ✔ Сменить полигон?
              </button>
              <button className="figma-btn" onClick={() => setConfirmSwitchAlliance(false)} style={{ padding: '6px 12px' }}>✕</button>
            </div>
          )}

          {authRole === 'admin' && (
            !confirmResetDb ? (
              <button className="figma-btn danger" onClick={() => setConfirmResetDb(true)} style={{ fontWeight: 'bold' }}>
                ⚠️ Сброс БД
              </button>
            ) : (
              <div className="flex-row" style={{ background: 'rgba(242,60,39,0.06)', padding: '4px 8px', borderRadius: '8px', border: '1px solid #ff3b30' }}>
                <span style={{ fontSize: '10px', color: '#ff3b30', fontWeight: 'bold' }}>Обнулить все команды?</span>
                <button className="figma-btn danger" onClick={handleResetDatabase} style={{ padding: '4px 10px', fontSize: '11px' }}>✔ Да</button>
                <button className="figma-btn" onClick={() => setConfirmResetDb(false)} style={{ padding: '4px 10px', fontSize: '11px' }}>✕</button>
              </div>
            )
          )}

          {!confirmLogout ? (
            <button className="figma-btn" onClick={() => setConfirmLogout(true)} style={{ color: '#ff3b30', borderColor: '#ff3b30' }}>
              Выйти
            </button>
          ) : (
            <div className="flex-row">
              <button className="figma-btn danger" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '12px' }}>✔ Выйти?</button>
              <button className="figma-btn" onClick={() => setConfirmLogout(false)} style={{ padding: '6px 12px' }}>✕</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace split */}
      <div className="figma-workspace">
        
        {/* Left Sidebar: Select & Reorder teams (Touch arrows & desktop drag-and-drop) */}
        <aside className="figma-sidebar left">
          <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '12px 20px', gap: '4px' }}>
            <span>Команды на Полигоне {polyNum}</span>
            <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-secondary)', textTransform: 'none' }}>
              Зажмите для перетаскивания (или используйте ▲/▼)
            </span>
          </div>
          <div className="sidebar-content">
            {teams.map((t, idx) => (
              <div 
                key={t.id}
                className={`tree-item ${selectedTeamId === t.id ? 'active' : ''}`}
                style={{ 
                  cursor: 'grab', 
                  opacity: draggedId === t.id ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                draggable="true"
                onDragStart={(e) => {
                  setDraggedId(t.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedId && draggedId !== t.id) {
                    moveTeam(draggedId, idx);
                  }
                }}
                onDragEnd={() => setDraggedId(null)}
                onClick={() => setSelectedTeamId(t.id)}
              >
                {/* Tactical Reorder arrows (Up/Down) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '6px' }} onClick={e => e.stopPropagation()}>
                  <button 
                    disabled={idx === 0} 
                    style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '2px', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1' }}
                    onClick={() => moveTeam(t.id, idx - 1)}
                  >
                    ▲
                  </button>
                  <button 
                    disabled={idx === teams.length - 1} 
                    style={{ border: 'none', background: 'none', cursor: idx === teams.length - 1 ? 'not-allowed' : 'pointer', padding: '2px', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1' }}
                    onClick={() => moveTeam(t.id, idx + 1)}
                  >
                    ▼
                  </button>
                </div>

                <div className="tree-item-icon">🤖</div>
                <div className="tree-item-meta" style={{ minWidth: 0 }}>
                  <span className="tree-item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.disqualified ? 'line-through' : 'none' }}>
                    {t.name} {t.disqualified && <span style={{ color: '#ff3b30', fontWeight: '900', fontSize: '9px' }}>[ДИСКВ.]</span>}
                  </span>
                  <span className="tree-item-details">р: #{t.rover} | г: #{t.gfsx}</span>
                </div>
                <span className="tree-item-score" style={{ color: t.disqualified ? '#ff3b30' : 'var(--text-primary)' }}>
                  {t.disqualified ? '0' : t.score} б.
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas: Big mobile-friendly scoring elements */}
        <main className="flex-1 flex flex-col min-w-0 relative h-screen">
          <div className="flex-1 overflow-y-auto bg-background bg-notebook relative p-4 md:p-8 z-0 pb-32">
            <div className="organic-blob w-[300px] h-[300px] top-[-80px] right-[-80px]"></div>
            
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-6" style={{ paddingBottom: '140px' }}>
              
              {/* Alert Status Banners */}
              {message.text && (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${message.type === 'success' ? '#0acf83' : '#ff3b30'}`,
                  backgroundColor: message.type === 'success' ? 'rgba(10,207,131,0.06)' : 'rgba(255,59,48,0.06)',
                  color: message.type === 'success' ? '#0acf83' : '#ff3b30',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>{message.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{message.text}</span>
                </div>
              )}

              {currentTeam ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Top Team Title & Real-time Live score calculations */}
                  <div className="flex-between">
                    <div>
                      <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {currentTeam.name} {disqualified && <span style={{ color: '#ff3b30' }}>(дисквалифицирована)</span>}
                      </h1>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '12px' }}>
                        Ровер #{currentTeam.rover} | GFS-X #{currentTeam.gfsx}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Текущий расчет</div>
                      <div style={{ fontSize: '32px', fontWeight: '900', color: allianceColor }}>
                        {calculateLiveScore()} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 105</span>
                      </div>
                    </div>
                  </div>

                  {/* ⏱ SECTION: High-Contrast Phone-optimized Stopwatch */}
                  <div className="stitch-card" style={{ border: '1px solid var(--border-default)', background: '#ffffff', boxShadow: 'var(--shadow-active)' }}>
                    <div style={{ display: 'flex', justifyWindow: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        ⏱ Секундомер заезда (Полигон {polyNum})
                      </span>
                      {isTimerRunning && <span className="pulse-indicator"></span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '12px 0' }}>
                      <div className="stopwatch-time" style={{ fontSize: '64px', letterSpacing: '2px', color: isTimerRunning ? '#0acf83' : 'var(--text-primary)' }}>
                        {formatTimerDisplay(elapsed)}
                      </div>
                    </div>

                    {/* Massive mobile stopwatch buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {!isTimerRunning ? (
                        <button 
                          className="figma-btn primary" 
                          onClick={handleStartTimer}
                          style={{ height: '48px', fontSize: '14px', borderRadius: '12px', fontWeight: 'bold' }}
                        >
                          ▶ Запустить таймер
                        </button>
                      ) : (
                        <button 
                          className="figma-btn" 
                          onClick={handlePauseTimer}
                          style={{ height: '48px', fontSize: '14px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: '#ebf3fa' }}
                        >
                          ⏸ Приостановить
                        </button>
                      )}

                      {!confirmResetTimer ? (
                        <button 
                          className="figma-btn danger" 
                          onClick={() => setConfirmResetTimer(true)}
                          style={{ height: '48px', fontSize: '14px', borderRadius: '12px', fontWeight: 'bold' }}
                        >
                          🔄 Сбросить
                        </button>
                      ) : (
                        <div className="flex-row w-full" style={{ gap: '6px' }}>
                          <button 
                            className="figma-btn danger w-full" 
                            onClick={handleResetTimer}
                            style={{ height: '48px', fontSize: '11px', borderRadius: '12px', fontWeight: 'bold', padding: 0 }}
                          >
                            ✔ Сбросить?
                          </button>
                          <button 
                            className="figma-btn w-full" 
                            onClick={() => setConfirmResetTimer(false)}
                            style={{ height: '48px', fontSize: '11px', borderRadius: '12px', padding: 0 }}
                          >
                            ✕ Отмена
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tap shortcut to fill form elapsed time */}
                    <button
                      type="button"
                      className="figma-btn w-full mt-16"
                      onClick={handleCopyTimerToForm}
                      style={{ height: '40px', borderColor: 'var(--text-primary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRadius: '12px' }}
                    >
                      ⏱ Скопировать показания секундомера в форму
                    </button>
                  </div>

                  {/* 📝 FORM SHEET */}
                  <form onSubmit={handleSaveScore} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* STAGE 1 CARD */}
                    <div className="stitch-card">
                      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '8px', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                          Этап 1: Яндекс.Ровер (5 минут)
                        </h3>
                        
                        {/* Skip Stage 1 button */}
                        <button
                          type="button"
                          className={`figma-btn ${stage1Skipped ? 'danger' : ''}`}
                          style={{ padding: '4px 12px', fontSize: '10px', borderRadius: '6px' }}
                          onClick={() => setStage1Skipped(!stage1Skipped)}
                        >
                          {stage1Skipped ? '✓ Ровер пропущен' : 'Prop: Скипнуть Ровер'}
                        </button>
                      </div>

                      {stage1Skipped ? (
                        <div style={{ padding: '16px', background: 'rgba(242, 60, 39, 0.05)', color: '#ff3b30', borderRadius: '8px', fontWeight: 'bold', border: '1px dashed rgba(242,60,39,0.2)' }}>
                          ⚠️ Этап 1 пропущен! Начислено 0 баллов и 5 минут (300 сек) штрафного времени к зачету.
                        </div>
                      ) : (
                        <>
                          {/* Find Ball block */}
                          <div className="figma-group">
                            <label className="figma-label">Поиск мяча скаутом</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '8px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${findBall === 'failed' ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px', padding: 0 }}
                                onClick={() => setFindBall('failed')}
                              >
                                Не найден (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${findBall === 'foxglove' ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px', padding: 0 }}
                                onClick={() => setFindBall('foxglove')}
                              >
                                в Foxglove (+5)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${findBall === 'autonomous' ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px', padding: 0 }}
                                onClick={() => setFindBall('autonomous')}
                              >
                                Автономно (+10)
                              </button>
                            </div>
                          </div>

                          {/* Activation block */}
                          <div className="figma-group" style={{ marginTop: '16px' }}>
                            <label className="figma-label">M2M Активация цепи запуска</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${activation === 'manual' ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setActivation('manual')}
                              >
                                Вручную (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${activation === 'success' ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setActivation('success')}
                              >
                                Автоматически (+10)
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* STAGE 2 CARD */}
                    <div className="stitch-card">
                      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '8px', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                          Этап 2: Гусеничный робот GFS-X (5 минут)
                        </h3>
                        
                        {/* Skip Stage 2 button */}
                        <button
                          type="button"
                          className={`figma-btn ${stage2Skipped ? 'danger' : ''}`}
                          style={{ padding: '4px 12px', fontSize: '10px', borderRadius: '6px' }}
                          onClick={() => setStage2Skipped(!stage2Skipped)}
                        >
                          {stage2Skipped ? '✓ Робот пропущен' : 'Prop: Скипнуть Робота'}
                        </button>
                      </div>

                      {stage2Skipped ? (
                        <div style={{ padding: '16px', background: 'rgba(242, 60, 39, 0.05)', color: '#ff3b30', borderRadius: '8px', fontWeight: 'bold', border: '1px dashed rgba(242,60,39,0.2)' }}>
                          ⚠️ Этап 2 пропущен! Начислено 0 баллов и 5 минут (300 сек) штрафного времени к зачету.
                        </div>
                      ) : (
                        <>
                          {/* Autonomous movement */}
                          <div className="figma-group">
                            <label className="figma-label">Автономное движение со старта (на политике)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${!stage2Autonomous ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setStage2Autonomous(false)}
                              >
                                Нет (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${stage2Autonomous ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setStage2Autonomous(true)}
                              >
                                Да (+20 баллов)
                              </button>
                            </div>
                          </div>

                          {/* Entered Zone & Collisions 1 */}
                          <div className="figma-group" style={{ marginTop: '16px' }}>
                            <label className="figma-label">Въезд в зону препятствий с мячом</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${!enteredZone ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setEnteredZone(false)}
                              >
                                Не доехал (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${enteredZone ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setEnteredZone(true)}
                              >
                                Заехал (+15 баллов)
                              </button>
                            </div>

                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '10px', 
                              backgroundColor: enteredZone ? 'rgba(10, 207, 131, 0.04)' : 'var(--bg-canvas)', 
                              border: enteredZone ? '1px solid rgba(10, 207, 131, 0.2)' : '1px solid var(--border-default)',
                              borderRadius: '8px',
                              marginTop: '8px'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600' }}>💥 Столкновения с коробками (Фаза 1)</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>-3 балла за каждое (не ниже 0)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <button
                                  type="button"
                                  className="figma-btn"
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, fontSize: '18px' }}
                                  onClick={() => setCollisions1(prev => Math.max(0, prev - 1))}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{collisions1}</span>
                                <button
                                  type="button"
                                  className="figma-btn"
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, fontSize: '18px' }}
                                  onClick={() => setCollisions1(prev => prev + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Catch ball */}
                          <div className="figma-group" style={{ marginTop: '16px' }}>
                            <label className="figma-label">Захват мяча клешнёй</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${!gfsxCatch ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setGfsxCatch(false)}
                              >
                                Нет (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${gfsxCatch ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setGfsxCatch(true)}
                              >
                                Да (+20 баллов)
                              </button>
                            </div>
                          </div>

                          {/* Return to Start & Collisions 2 */}
                          <div className="figma-group" style={{ marginTop: '16px' }}>
                            <label className="figma-label">Возврат в стартовую зону</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${!returnToStart ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setReturnToStart(false)}
                              >
                                Не вернулся (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${returnToStart ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setReturnToStart(true)}
                              >
                                Вернулся (+15 баллов)
                              </button>
                            </div>

                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '10px', 
                              backgroundColor: returnToStart ? 'rgba(10, 207, 131, 0.04)' : 'var(--bg-canvas)', 
                              border: returnToStart ? '1px solid rgba(10, 207, 131, 0.2)' : '1px solid var(--border-default)',
                              borderRadius: '8px',
                              marginTop: '8px'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600' }}>💥 Столкновения с коробками (Фаза 2)</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>-3 балла за каждое (не ниже 0)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <button
                                  type="button"
                                  className="figma-btn"
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, fontSize: '18px' }}
                                  onClick={() => setCollisions2(prev => Math.max(0, prev - 1))}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{collisions2}</span>
                                <button
                                  type="button"
                                  className="figma-btn"
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, fontSize: '18px' }}
                                  onClick={() => setCollisions2(prev => prev + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Return with ball */}
                          <div className="figma-group" style={{ marginTop: '16px' }}>
                            <label className="figma-label">Доставка и удержание мяча на финише</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button
                                type="button"
                                className={`figma-btn ${!returnWithBall ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setReturnWithBall(false)}
                              >
                                Нет (0)
                              </button>
                              <button
                                type="button"
                                className={`figma-btn ${returnWithBall ? 'primary' : ''}`}
                                style={{ borderRadius: '10px', height: '42px' }}
                                onClick={() => setReturnWithBall(true)}
                              >
                                Да (+15 баллов)
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* GENERAL PENALTIES CARD */}
                    <div className="stitch-card">
                      <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px', color: '#ff3b30' }}>
                        Нарушения и Штрафы
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: 'rgba(255, 59, 48, 0.04)', border: '1px solid rgba(255, 59, 48, 0.1)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 'bold', color: '#ff3b30' }}>Перенос застрявшего робота</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Ручной перенос робота на старт (-15 баллов за каждый)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <button
                            type="button"
                            className="figma-btn"
                            style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, fontSize: '18px' }}
                            onClick={() => setResets(prev => Math.max(0, prev - 1))}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '20px', textAlign: 'center', color: '#ff3b30' }}>{resets}</span>
                          <button
                            type="button"
                            className="figma-btn"
                            style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0, fontSize: '18px' }}
                            onClick={() => setResets(prev => prev + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* DURATION INPUT CARD */}
                    <div className="stitch-card">
                      <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px', color: 'var(--text-primary)' }}>
                        Время прохождения трассы {stage1Skipped || stage2Skipped ? '(без учета пропусков)' : ''}
                      </h3>

                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flexGrow: 1 }}>
                          <label className="figma-label">Минуты</label>
                          <input
                            type="number"
                            className="figma-input text-center"
                            style={{ height: '44px', fontSize: '16px' }}
                            value={timeMin}
                            onChange={(e) => setTimeMin(Math.max(0, parseInt(e.target.value) || 0))}
                          />
                        </div>
                        <div style={{ fontSize: '24px', paddingTop: '16px', fontWeight: 'bold' }}>:</div>
                        <div style={{ flexGrow: 1 }}>
                          <label className="figma-label">Секунды</label>
                          <input
                            type="number"
                            className="figma-input text-center"
                            style={{ height: '44px', fontSize: '16px' }}
                            value={timeSec}
                            onChange={(e) => setTimeSec(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                          />
                        </div>
                      </div>
                      
                      {(stage1Skipped || stage2Skipped) && (
                        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          * При сохранении к зачету будет автоматически начислено: 
                          {stage1Skipped && ' +5 минут за Ровер'}
                          {stage2Skipped && ' +5 минут за Гусеничного'}
                        </div>
                      )}
                    </div>

                    {/* DISQUALIFICATION CARD (🚫 Вмешательство/Срыв правил) */}
                    <div className="stitch-card" style={{ border: '1px solid rgba(242, 60, 39, 0.2)', background: 'rgba(242, 60, 39, 0.02)' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: '#ff3b30' }}>
                        🚫 ДИСКВАЛИФИЦИРОВАТЬ КОМАНДУ
                      </h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Любое грубое нарушение (например, физическое или сетевое воздействие на чужой полигон). Это обнулит все баллы за попытку.
                      </p>
                      
                      {!confirmDisqualify ? (
                        <button
                          type="button"
                          className="figma-btn danger w-full"
                          onClick={() => setConfirmDisqualify(true)}
                          style={{ height: '44px', fontWeight: 'bold', borderRadius: '10px' }}
                        >
                          {disqualified ? '✅ Восстановить статус команды' : '🚫 Дисквалифицировать команду'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="figma-btn danger"
                            style={{ flexGrow: 1, height: '44px', fontWeight: 'bold', borderRadius: '10px' }}
                            onClick={() => {
                              setDisqualified(!disqualified);
                              setConfirmDisqualify(false);
                              showStatus(disqualified ? 'Команда восстановлена' : 'Команда дисквалифицирована!', 'success');
                            }}
                          >
                            {disqualified ? '✔ Да, отменить дискв.?' : '✔ Да, дисквалифицировать?'}
                          </button>
                          <button
                            type="button"
                            className="figma-btn"
                            style={{ height: '44px', fontWeight: 'bold', borderRadius: '10px' }}
                            onClick={() => setConfirmDisqualify(false)}
                          >
                            ✕ Отмена
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <button 
                      type="submit" 
                      className="figma-btn primary"
                      style={{ height: '54px', fontSize: '14px', fontWeight: 'bold', borderRadius: '14px', width: '100%', boxShadow: '0 4px 12px rgba(1, 58, 114, 0.2)' }}
                    >
                      💾 Сохранить ведомость команды
                    </button>

                  </form>
                </div>
              ) : (
                <div className="stitch-card text-center" style={{ padding: '40px 20px' }}>
                  Выберите команду в левом меню для заполнения ведомости.
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
                opacity: 0.8,
                width: '100%'
              }}>
                <div>
                  🔐 <b>Консоль судьи</b> · Полигон {polyNum}
                </div>
                <div>
                  Yandex Camp 2026
                </div>
              </footer>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export default function AdminConsole() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Roster Edit form states
  const [selectedAllianceId, setSelectedAllianceId] = useState('A');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [editName, setEditName] = useState('');
  const [editRover, setEditRover] = useState('');
  const [editGfsx, setEditGfsx] = useState('');

  // Swap utility states
  const [swapTeamId1, setSwapTeamId1] = useState('');
  const [swapTeamId2, setSwapTeamId2] = useState('');

  // Drag and drop / chevron reorder states
  const [draggedId, setDraggedId] = useState(null);
  const [draggedAllianceId, setDraggedAllianceId] = useState(null);

  // In-line UI confirmations
  const [confirmSwap, setConfirmSwap] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Auth check on mount
  useEffect(() => {
    const saved = localStorage.getItem('yacamp_admin_passcode');
    if (saved) {
      setPasscode(saved);
      checkPasscode(saved);
    }
  }, []);

  const checkPasscode = async (code) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.role === 'admin') {
          setIsAuthenticated(true);
          localStorage.setItem('yacamp_admin_passcode', code);
          fetchData();
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('yacamp_admin_passcode');
        }
      } else {
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
      if (res.ok && json.role === 'admin') {
        setIsAuthenticated(true);
        localStorage.setItem('yacamp_admin_passcode', passcode);
        showStatus('Авторизация администратора успешна!', 'success');
        fetchData();
      } else if (res.ok) {
        showStatus('Данный ключ предназначен для судей. Доступ к админ-панели заблокирован.', 'error');
      } else {
        showStatus(json.error || 'Неверный ключ доступа', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('yacamp_admin_passcode');
    setIsAuthenticated(false);
    setData(null);
    setConfirmLogout(false);
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/score');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    }
  };

  const showStatus = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Populate edit form when team selection changes
  useEffect(() => {
    if (!data || !selectedTeamId) return;
    const team = findTeamById(selectedTeamId);
    if (team) {
      setEditName(team.name);
      setEditRover(team.rover);
      setEditGfsx(team.gfsx);
    }
  }, [selectedTeamId]);

  // Reset team selection when alliance dropdown changes
  useEffect(() => {
    if (data) {
      const teams = data.alliances[selectedAllianceId].teams;
      if (teams.length > 0) {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [selectedAllianceId, data]);

  const findTeamById = (id) => {
    if (!data) return null;
    for (const allianceId in data.alliances) {
      const team = data.alliances[allianceId].teams.find(t => t.id === id);
      if (team) return team;
    }
    return null;
  };

  // Administrative team reordering
  const moveTeam = async (aid, id, targetIdx) => {
    if (!data) return;
    const alliance = data.alliances[aid];
    if (!alliance || targetIdx < 0 || targetIdx >= alliance.teams.length) return;
    
    const orderedTeamIds = alliance.teams.map(t => t.id);
    const currentIdx = orderedTeamIds.indexOf(id);
    if (currentIdx === -1) return;
    
    orderedTeamIds.splice(currentIdx, 1);
    orderedTeamIds.splice(targetIdx, 0, id);
    
    // Optimistic UI update
    const rearrangedTeams = orderedTeamIds.map(tid => alliance.teams.find(t => t.id === tid));
    const updatedData = { ...data };
    updatedData.alliances[aid].teams = rearrangedTeams;
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
          allianceId: aid,
          orderedTeamIds
        })
      });
      if (res.ok) {
        showStatus('Порядок команд успешно обновлен!', 'success');
        fetchData();
      } else {
        showStatus('Не удалось сохранить изменения порядка выступлений', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  const handleSaveTeamEdit = async (e) => {
    e.preventDefault();
    if (!selectedTeamId || !editName) return;

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'editTeam',
          allianceId: selectedAllianceId,
          teamId: selectedTeamId,
          name: editName,
          rover: editRover,
          gfsx: editGfsx
        })
      });

      const json = await res.json();
      if (res.ok) {
        showStatus('Параметры команды успешно обновлены!', 'success');
        fetchData();
      } else {
        showStatus(json.error || 'Ошибка сохранения изменений', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  const handleSwapTeamsSubmit = async (e) => {
    e.preventDefault();
    if (!swapTeamId1 || !swapTeamId2) {
      showStatus('Выберите обе команды для обмена', 'error');
      return;
    }

    if (swapTeamId1 === swapTeamId2) {
      showStatus('Выберите разные команды для обмена', 'error');
      return;
    }

    // Toggle to inline swap confirmation state
    setConfirmSwap(true);
  };

  const executeSwapTeams = async () => {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passcode}`
        },
        body: JSON.stringify({
          action: 'swapTeams',
          teamId1: swapTeamId1,
          teamId2: swapTeamId2
        })
      });

      const json = await res.json();
      if (res.ok) {
        showStatus('Команды успешно поменялись местами!', 'success');
        setSwapTeamId1('');
        setSwapTeamId2('');
        setConfirmSwap(false);
        fetchData();
      } else {
        showStatus(json.error || 'Ошибка перестановки', 'error');
      }
    } catch (err) {
      showStatus('Ошибка подключения: ' + err.message, 'error');
    }
  };

  // Build a flat list of all teams for the swap dropdowns
  const allTeamsList = data ? [
    ...data.alliances.A.teams.map(t => ({ ...t, allianceLabel: '🔴 Альянс А' })),
    ...data.alliances.B.teams.map(t => ({ ...t, allianceLabel: '🔵 Альянс B' })),
    ...data.alliances.C.teams.map(t => ({ ...t, allianceLabel: '🟡 Альянс C' }))
  ] : [];

  // ========================================================
  // VIEW 1: Admin Login Gate
  // ========================================================
  if (!isAuthenticated) {
    return (
      <div className="auth-wall-container">
        <div className="organic-blob w-[400px] h-[400px] top-[-100px] right-[-100px]"></div>
        
        <form className="auth-card" onSubmit={handleLoginSubmit}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Панель Администратора
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Доступ только для организаторов соревнований Яндекс.Кемп.
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
            <label className="figma-label">Ключ администратора</label>
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
            Авторизоваться
          </button>
        </form>
      </div>
    );
  }

  // ========================================================
  // VIEW 2: Active Admin Console Dashboard
  // ========================================================
  const activeTeams = data ? data.alliances[selectedAllianceId].teams : [];

  return (
    <div className="figma-app">
      {/* Top Toolbar */}
      <header className="figma-toolbar">
        <div className="toolbar-left">
          <span className="figma-logo-badge" style={{ fontWeight: 'bold' }}>
            <span style={{ fontSize: '18px', marginRight: '6px' }}>📁</span>
            <span>Панель Администратора</span>
          </span>
        </div>

        <div className="toolbar-right" style={{ gap: '10px' }}>
          <a href="/" className="figma-btn" style={{ fontWeight: 'bold' }}>
            📊 На дашборд
          </a>
          
          {!confirmLogout ? (
            <button className="figma-btn" onClick={() => setConfirmLogout(true)} style={{ color: '#ff3b30', borderColor: '#ff3b30' }}>
              Выйти
            </button>
          ) : (
            <div className="flex-row">
              <button className="figma-btn danger" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '12px' }}>
                ✔ Выйти из админ-панели?
              </button>
              <button className="figma-btn" onClick={() => setConfirmLogout(false)} style={{ padding: '6px 12px' }}>✕</button>
            </div>
          )}
        </div>
      </header>

      {/* Main content grid */}
      <div className="figma-workspace">
        
        {/* Left Side: Summary Roster Viewer with Drag-and-Drop / Arrow ordering support */}
        <aside className="figma-sidebar left wide">
          <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '12px 20px', gap: '4px' }}>
            <span>Состав команд в базе</span>
            <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-secondary)', textTransform: 'none' }}>
              Зажмите элемент для перемещения (или юзайте ▲/▼)
            </span>
          </div>
          <div className="sidebar-content" style={{ padding: '10px 16px' }}>
            {['A', 'B', 'C'].map(aid => {
              const alliance = data?.alliances[aid];
              const allianceColor = aid === 'A' ? 'var(--alliance-a)' : aid === 'B' ? 'var(--alliance-b)' : 'var(--alliance-c)';
              return (
                <div key={aid} style={{ marginBottom: '24px' }}>
                  <div style={{ fontWeight: '800', color: allianceColor, fontSize: '13px', marginBottom: '8px' }}>
                    {aid === 'A' ? '🔴 Мега-Альянс А' : aid === 'B' ? '🔵 Мега-Альянс B' : '🟡 Мега-Альянс C'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {alliance?.teams.map((t, idx) => (
                      <div 
                        key={t.id} 
                        style={{ 
                          padding: '8px 12px', 
                          backgroundColor: 'var(--bg-canvas)', 
                          border: '1px solid var(--border-default)', 
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'grab',
                          opacity: draggedId === t.id ? 0.4 : 1
                        }}
                        draggable="true"
                        onDragStart={(e) => {
                          setDraggedId(t.id);
                          setDraggedAllianceId(aid);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedId && draggedAllianceId === aid && draggedId !== t.id) {
                            moveTeam(aid, draggedId, idx);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDraggedAllianceId(null);
                        }}
                      >
                        {/* Chevrons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginRight: '6px' }}>
                          <button 
                            disabled={idx === 0} 
                            style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '9px', padding: 0, color: 'var(--text-secondary)' }}
                            onClick={() => moveTeam(aid, t.id, idx - 1)}
                          >
                            ▲
                          </button>
                          <button 
                            disabled={idx === alliance.teams.length - 1} 
                            style={{ border: 'none', background: 'none', cursor: idx === alliance.teams.length - 1 ? 'not-allowed' : 'pointer', fontSize: '9px', padding: 0, color: 'var(--text-secondary)' }}
                            onClick={() => moveTeam(aid, t.id, idx + 1)}
                          >
                            ▼
                          </button>
                        </div>
                        
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.name} {t.disqualified && <span style={{ color: '#ff3b30', fontSize: '9px', fontWeight: 'bold' }}>[ДИСКВ.]</span>}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            ровер: #{t.rover} | gfsx: #{t.gfsx}
                          </div>
                        </div>
                        <span className="score-badge-inline" style={{ background: '#ebf3fa', fontWeight: 'bold', marginLeft: '8px' }}>
                          {t.disqualified ? '0' : t.score} б.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Central Workspace: Editor and swap utilities */}
        <main className="flex-1 flex flex-col min-w-0 relative h-screen">
          <div className="flex-1 overflow-y-auto bg-background bg-notebook relative p-6 md:p-10 pb-32 z-0">
            <div className="organic-blob w-[400px] h-[400px] top-[-100px] right-[-100px]"></div>
            
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-8" style={{ paddingBottom: '140px' }}>
              
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

              {/* SECTION 1: Team details editor */}
              <div className="stitch-card">
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px', color: 'var(--text-primary)' }}>
                  📝 Редактировать свойства и состав команды
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
                  <div>
                    <label className="figma-label">Выберите альянс команды</label>
                    <select 
                      className="figma-input"
                      value={selectedAllianceId}
                      onChange={(e) => setSelectedAllianceId(e.target.value)}
                    >
                      <option value="A">Мега-Альянс А (Красный)</option>
                      <option value="B">Мега-Альянс B (Синий)</option>
                      <option value="C">Мега-Альянс C (Желтый)</option>
                    </select>
                  </div>

                  <div>
                    <label className="figma-label">Выберите команду</label>
                    <select 
                      className="figma-input"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      {activeTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (ровер: {t.rover} | gfs: {t.gfsx})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <form onSubmit={handleSaveTeamEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="figma-label">Название команды</label>
                    <input 
                      type="text" 
                      className="figma-input" 
                      style={{ height: '40px' }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="figma-label">ID Ровера (Яндекс.Ровер)</label>
                      <input 
                        type="text" 
                        className="figma-input" 
                        style={{ height: '40px' }}
                        value={editRover}
                        onChange={(e) => setEditRover(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="figma-label">ID Гусеничного робота (GFS-X)</label>
                      <input 
                        type="text" 
                        className="figma-input" 
                        style={{ height: '40px' }}
                        value={editGfsx}
                        onChange={(e) => setEditGfsx(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="figma-btn primary mt-8" 
                    style={{ height: '44px', fontWeight: 'bold' }}
                  >
                    💾 Сохранить изменения
                  </button>
                </form>
              </div>

              {/* SECTION 2: Swapping team positions with Inline UI Confirmation */}
              <div className="stitch-card" style={{ border: '1px solid #ffd8a8', background: 'rgba(255, 146, 0, 0.02)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#e67e22' }}>
                  🔄 Быстрая рокировка (Поменять команды местами)
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Этот инструмент перенесет все баллы, секундомеры и составы между двумя выбранными позициями. Первоначальные ссылки и связи на дашборде сохранятся автоматически.
                </p>

                <form onSubmit={handleSwapTeamsSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="figma-label">Первая команда</label>
                      <select 
                        className="figma-input"
                        value={swapTeamId1}
                        onChange={(e) => setSwapTeamId1(e.target.value)}
                      >
                        <option value="">-- Выберите команду --</option>
                        {allTeamsList.map(t => (
                          <option key={t.id} value={t.id}>{t.allianceLabel} · {t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="figma-label">Вторая команда</label>
                      <select 
                        className="figma-input"
                        value={swapTeamId2}
                        onChange={(e) => setSwapTeamId2(e.target.value)}
                      >
                        <option value="">-- Выберите команду --</option>
                        {allTeamsList.map(t => (
                          <option key={t.id} value={t.id}>{t.allianceLabel} · {t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!confirmSwap ? (
                    <button 
                      type="submit" 
                      className="figma-btn primary w-full mt-16" 
                      style={{ height: '44px', fontWeight: 'bold', backgroundColor: '#e67e22', borderColor: '#e67e22' }}
                    >
                      🔄 Произвести рокировку
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button 
                        type="button"
                        className="figma-btn primary" 
                        onClick={executeSwapTeams}
                        style={{ flexGrow: 1, height: '44px', fontWeight: 'bold', backgroundColor: '#e67e22', borderColor: '#e67e22' }}
                      >
                        ✔ Да, поменять составы?
                      </button>
                      <button 
                        type="button"
                        className="figma-btn" 
                        onClick={() => setConfirmSwap(false)}
                        style={{ height: '44px' }}
                      >
                        ✕ Отмена
                      </button>
                    </div>
                  )}
                </form>
              </div>

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
                  📁 <b>Панель администратора</b> · Конфигурация составов
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

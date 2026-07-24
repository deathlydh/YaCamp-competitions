import { NextResponse } from 'next/server';
import { getDbData, saveDbData, calculateTeamScore } from '@/lib/db';

const JUDGE_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD_ADMIN;

function getAuthRole(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '').trim();
  if (ADMIN_PASSWORD && token === ADMIN_PASSWORD) return 'admin';
  if (JUDGE_PASSWORD && token === JUDGE_PASSWORD) return 'judge';
  return null;
}

export async function GET() {
  try {
    const data = await getDbData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const role = getAuthRole(request);
  if (!role) {
    return NextResponse.json({ error: 'Ошибка авторизации: неверный ключ доступа' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, allianceId, teamId, team, activeRun, name, rover, gfsx, teamId1, teamId2, orderedTeamIds } = body;
    const dbData = await getDbData();

    // ==========================================
    // ACTION: updateTeam (Judges and Admins)
    // ==========================================
    if (action === 'updateTeam') {
      if (!allianceId || !teamId || !team) {
        return NextResponse.json({ error: 'Не хватает обязательных параметров' }, { status: 400 });
      }

      const alliance = dbData.alliances[allianceId];
      if (!alliance) {
        return NextResponse.json({ error: 'Альянс не найден' }, { status: 404 });
      }

      const teamIndex = alliance.teams.findIndex(t => t.id === teamId);
      if (teamIndex === -1) {
        return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
      }

      // Calculate score based on official rules
      team.score = calculateTeamScore(team);
      
      // Update team inside DB data
      alliance.teams[teamIndex] = team;
      dbData.alliances[allianceId] = alliance;

      await saveDbData(dbData);
      return NextResponse.json({ success: true, team });
    } 
    
    // ==========================================
    // ACTION: updateActiveRun (Judges and Admins)
    // ==========================================
    else if (action === 'updateActiveRun') {
      if (!allianceId || !activeRun) {
        return NextResponse.json({ error: 'Не хватает обязательных параметров (allianceId, activeRun)' }, { status: 400 });
      }
      
      if (!dbData.activeRuns) {
        dbData.activeRuns = {};
      }
      
      dbData.activeRuns[allianceId] = activeRun;
      await saveDbData(dbData);
      return NextResponse.json({ success: true, activeRun: dbData.activeRuns[allianceId] });
    } 
    
    // ==========================================
    // ACTION: editTeam (Admin only)
    // ==========================================
    else if (action === 'editTeam') {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Недостаточно прав: требуется роль администратора' }, { status: 403 });
      }

      if (!allianceId || !teamId || !name) {
        return NextResponse.json({ error: 'Укажите allianceId, teamId и название команды' }, { status: 400 });
      }

      const alliance = dbData.alliances[allianceId];
      if (!alliance) {
        return NextResponse.json({ error: 'Альянс не найден' }, { status: 404 });
      }

      const teamRef = alliance.teams.find(t => t.id === teamId);
      if (!teamRef) {
        return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
      }

      // Update name and robot IDs
      teamRef.name = name;
      teamRef.rover = rover || '';
      teamRef.gfsx = gfsx || '';

      await saveDbData(dbData);
      return NextResponse.json({ success: true, team: teamRef });
    }

    // ==========================================
    // ACTION: swapTeams (Admin only)
    // ==========================================
    else if (action === 'swapTeams') {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Недостаточно прав: требуется роль администратора' }, { status: 403 });
      }

      if (!teamId1 || !teamId2) {
        return NextResponse.json({ error: 'Укажите teamId1 и teamId2 для перестановки' }, { status: 400 });
      }

      let t1Ref = null, t2Ref = null;
      for (const aid of ['A', 'B', 'C']) {
        const t1 = dbData.alliances[aid].teams.find(t => t.id === teamId1);
        if (t1) t1Ref = t1;

        const t2 = dbData.alliances[aid].teams.find(t => t.id === teamId2);
        if (t2) t2Ref = t2;
      }

      if (!t1Ref || !t2Ref) {
        return NextResponse.json({ error: 'Одна из команд не найдена в базе данных' }, { status: 404 });
      }

      // Swap team attributes (excluding key ID so dashboard links remain valid)
      const temp = {
        name: t1Ref.name,
        rover: t1Ref.rover,
        gfsx: t1Ref.gfsx,
        score: t1Ref.score,
        timeSeconds: t1Ref.timeSeconds,
        stage1: { ...t1Ref.stage1 },
        stage2: { ...t1Ref.stage2 },
        penalties: { ...t1Ref.penalties }
      };

      t1Ref.name = t2Ref.name;
      t1Ref.rover = t2Ref.rover;
      t1Ref.gfsx = t2Ref.gfsx;
      t1Ref.score = t2Ref.score;
      t1Ref.timeSeconds = t2Ref.timeSeconds;
      t1Ref.stage1 = { ...t2Ref.stage1 };
      t1Ref.stage2 = { ...t2Ref.stage2 };
      t1Ref.penalties = { ...t2Ref.penalties };

      t2Ref.name = temp.name;
      t2Ref.rover = temp.rover;
      t2Ref.gfsx = temp.gfsx;
      t2Ref.score = temp.score;
      t2Ref.timeSeconds = temp.timeSeconds;
      t2Ref.stage1 = temp.stage1;
      t2Ref.stage2 = temp.stage2;
      t2Ref.penalties = temp.penalties;

      await saveDbData(dbData);
      return NextResponse.json({ success: true, message: 'Команды успешно поменялись местами' });
    }

    // ==========================================
    // ACTION: reorderTeams (Judges and Admins)
    // ==========================================
    else if (action === 'reorderTeams') {
      if (!allianceId || !orderedTeamIds || !Array.isArray(orderedTeamIds)) {
        return NextResponse.json({ error: 'Укажите allianceId и массив orderedTeamIds' }, { status: 400 });
      }

      const alliance = dbData.alliances[allianceId];
      if (!alliance) {
        return NextResponse.json({ error: 'Альянс не найден' }, { status: 404 });
      }

      // Reorder teams array based on the ordered IDs
      const reorderedTeams = [];
      orderedTeamIds.forEach(id => {
        const team = alliance.teams.find(t => t.id === id);
        if (team) {
          reorderedTeams.push(team);
        }
      });

      // Add any missing teams just in case
      alliance.teams.forEach(team => {
        if (!reorderedTeams.some(t => t.id === team.id)) {
          reorderedTeams.push(team);
        }
      });

      alliance.teams = reorderedTeams;
      dbData.alliances[allianceId] = alliance;

      await saveDbData(dbData);
      return NextResponse.json({ success: true, message: 'Порядок выступления обновлен' });
    }

    // ==========================================
    // ACTION: resetDb (Judges and Admins)
    // ==========================================
    else if (action === 'resetDb') {
      const freshDbData = {
        alliances: {
          A: {
            id: "A",
            name: "Мега-Альянс А",
            color: "#FF3B30",
            teams: dbData.alliances.A.teams.map(t => ({
              ...t,
              score: 0, timeSeconds: 0,
              stage1: { findBall: "failed", activation: "manual" },
              stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false },
              penalties: { resets: 0 }
            }))
          },
          B: {
            id: "B",
            name: "Мега-Альянс B",
            color: "#007AFF",
            teams: dbData.alliances.B.teams.map(t => ({
              ...t,
              score: 0, timeSeconds: 0,
              stage1: { findBall: "failed", activation: "manual" },
              stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false },
              penalties: { resets: 0 }
            }))
          },
          C: {
            id: "C",
            name: "Мега-Альянс C",
            color: "#FFCC00",
            teams: dbData.alliances.C.teams.map(t => ({
              ...t,
              score: 0, timeSeconds: 0,
              stage1: { findBall: "failed", activation: "manual" },
              stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false },
              penalties: { resets: 0 }
            }))
          }
        },
        activeRuns: {
          A: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 },
          B: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 },
          C: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 }
        }
      };
      
      await saveDbData(freshDbData);
      return NextResponse.json({ success: true, message: 'База данных успешно сброшена' });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

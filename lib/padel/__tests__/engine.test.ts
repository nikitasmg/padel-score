import { describe, it, expect } from "vitest";
import { createMatch, scorePoint, undo, finishMatch } from "@/lib/padel/engine";
import type { Config, Team, TeamIndex } from "@/lib/padel/types";

const cfg: Config = { sets: 3, gamesPerSet: 6, goldenPoint: true, tiebreak: true };
const teams: [Team, Team] = [
  { players: [{ name: "Алекс" }, { name: "Марко" }] },
  { players: [{ name: "Дима" }, { name: "Соня" }] },
];
const m = () => createMatch(cfg, teams, 1000);

describe("createMatch", () => {
  it("стартовое состояние нулевое", () => {
    const s = m();
    expect(s.status).toBe("in_progress");
    expect(s.score[0].points).toBe(0);
    expect(s.score[0].sets).toBe(0);
    expect(s.currentSet).toBe(0);
    expect(s.score[0].games[0]).toBe(0);
    expect(s.startedAt).toBe(1000);
    expect(s.history).toEqual([]);
  });
});

describe("scorePoint — очки в гейме", () => {
  it("0→15→30→40", () => {
    let s = m();
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(1);
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(2);
    s = scorePoint(s, 0); expect(s.score[0].points).toBe(3);
    // гейм ещё не выигран
    expect(s.score[0].games[0]).toBe(0);
  });

  it("4 очка подряд при ведении → выигран гейм, очки сброшены", () => {
    let s = m();
    for (let i = 0; i < 4; i++) s = scorePoint(s, 0);
    expect(s.score[0].games[0]).toBe(1);
    expect(s.score[0].points).toBe(0);
    expect(s.score[1].points).toBe(0);
  });

  it("каждый разыгранный мяч кладёт снимок в историю", () => {
    let s = m();
    s = scorePoint(s, 0);
    expect(s.history.length).toBe(1);
    s = scorePoint(s, 1);
    expect(s.history.length).toBe(2);
  });
});

// ===== Task 4: deuce / golden point / advantage =====
function play(seq: TeamIndex[], config = cfg) {
  let s = createMatch(config, teams, 1000);
  for (const t of seq) s = scorePoint(s, t);
  return s;
}

describe("40-40 golden point", () => {
  it("после 40-40 один мяч берёт гейм", () => {
    let s = play([0, 1, 0, 1, 0, 1]); // 3-3
    expect(s.score[0].points).toBe(3);
    expect(s.score[1].points).toBe(3);
    s = scorePoint(s, 0);
    expect(s.score[0].games[0]).toBe(1); // гейм взят сразу
  });
});

describe("40-40 advantage (без golden point)", () => {
  const adv = { ...cfg, goldenPoint: false };
  it("нужно выиграть 2 мяча подряд от 40-40", () => {
    let s = play([0, 1, 0, 1, 0, 1], adv); // 3-3
    s = scorePoint(s, 0); // AD команда 0 (4-3)
    expect(s.score[0].games[0]).toBe(0);
    s = scorePoint(s, 1); // снова ровно (4-4)
    expect(s.score[0].games[0]).toBe(0);
    s = scorePoint(s, 0); // AD (5-4)
    s = scorePoint(s, 0); // гейм (6-4)
    expect(s.score[0].games[0]).toBe(1);
  });
});

describe("сторона подачи deuce/ad по чётности очков", () => {
  it("при сумме очков нечётной — ad, чётной — deuce", () => {
    let s = createMatch(cfg, teams, 1000);
    expect(s.serving.side).toBe("deuce"); // 0+0
    s = scorePoint(s, 0); // сумма 1
    expect(s.serving.side).toBe("ad");
    s = scorePoint(s, 1); // сумма 2
    expect(s.serving.side).toBe("deuce");
  });
});

// ===== Task 5: завершение гейма/сета/матча =====
// helper: выиграть N геймов подряд командой t (по 4 чистых очка)
function winGames(s: ReturnType<typeof createMatch>, t: TeamIndex, n: number) {
  for (let g = 0; g < n; g++) for (let p = 0; p < 4; p++) s = scorePoint(s, t);
  return s;
}

describe("завершение сета", () => {
  it("6 геймов подряд → сет взят, новый сет начат", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 6);
    expect(s.score[0].sets).toBe(1);
    expect(s.currentSet).toBe(1);
    expect(s.score[0].games[1]).toBe(0);
  });
});

describe("завершение матча (best of 3)", () => {
  it("2 сета подряд → completed + winner", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 6); // сет 1
    s = winGames(s, 0, 6); // сет 2
    expect(s.status).toBe("completed");
    expect(s.winner).toBe(0);
  });

  it("после completed scorePoint ничего не меняет", () => {
    let s = createMatch(cfg, teams, 1000);
    s = winGames(s, 0, 6); s = winGames(s, 0, 6);
    const before = structuredClone(s);
    s = scorePoint(s, 1);
    expect(s.status).toBe("completed");
    expect(s.score).toEqual(before.score);
  });
});

describe("best of 1", () => {
  it("один сет решает матч", () => {
    let s = createMatch({ ...cfg, sets: 1 }, teams, 1000);
    s = winGames(s, 0, 6);
    expect(s.status).toBe("completed");
    expect(s.winner).toBe(0);
  });
});

// ===== Task 6: тай-брейк =====
describe("тай-брейк", () => {
  // довести сет до 6-6: команды берут по 6 геймов поочерёдно
  function to6to6(config = cfg) {
    let s = createMatch(config, teams, 1000);
    for (let g = 0; g < 6; g++) {
      for (let p = 0; p < 4; p++) s = scorePoint(s, 0);
      for (let p = 0; p < 4; p++) s = scorePoint(s, 1);
    }
    return s; // 6-6
  }

  it("при 6-6 включается тай-брейк", () => {
    const s = to6to6();
    expect(s.score[0].games[0]).toBe(6);
    expect(s.score[1].games[0]).toBe(6);
    expect(s.inTiebreak).toBe(true);
  });

  it("тай-брейк до 7 (win by 2) → сет 7-6 и берёт сет", () => {
    let s = to6to6();
    for (let p = 0; p < 7; p++) s = scorePoint(s, 0); // 7-0 тай-брейк
    expect(s.inTiebreak).toBe(false);
    expect(s.score[0].games[0]).toBe(7);
    expect(s.score[0].sets).toBe(1);
    expect(s.currentSet).toBe(1);
  });

  it("без tiebreak — продолжается по геймам (нет инициации тай-брейка)", () => {
    const s = to6to6({ ...cfg, tiebreak: false });
    expect(s.inTiebreak).toBe(false);
  });

  it("подача в тай-брейке меняется после 1-го очка и держится 2 очка", () => {
    let s = to6to6();
    const s0 = { ...s.serving }; // стартовый подающий тай-брейка
    s = scorePoint(s, 0); // 1-е очко → смена подачи
    const s1 = { ...s.serving };
    expect(s1.team === s0.team && s1.player === s0.player).toBe(false);
    s = scorePoint(s, 1); // 2-е очко → подача та же
    expect(s.serving.team).toBe(s1.team);
    expect(s.serving.player).toBe(s1.player);
    s = scorePoint(s, 0); // 3-е очко → снова смена
    expect(s.serving.team === s1.team && s.serving.player === s1.player).toBe(false);
  });
});

describe("undo", () => {
  it("откатывает последний разыгранный мяч", () => {
    let s = createMatch(cfg, teams, 1000);
    s = scorePoint(s, 0);
    s = undo(s);
    expect(s.score[0].points).toBe(0);
    expect(s.history.length).toBe(0);
  });
  it("откатывает через границу гейма", () => {
    let s = createMatch(cfg, teams, 1000);
    for (let i = 0; i < 4; i++) s = scorePoint(s, 0); // гейм взят
    expect(s.score[0].games[0]).toBe(1);
    s = undo(s); // назад к 40-…
    expect(s.score[0].games[0]).toBe(0);
    expect(s.score[0].points).toBe(3);
  });
  it("undo без истории — без изменений", () => {
    const s = createMatch(cfg, teams, 1000);
    expect(undo(s)).toEqual(s);
  });
});

describe("finishMatch — ручное завершение", () => {
  it("победитель по большему числу сетов", () => {
    let s = m();
    s.score[0].sets = 1;
    const r = finishMatch(s);
    expect(r.status).toBe("completed");
    expect(r.winner).toBe(0);
  });

  it("при равных сетах — по геймам текущего сета", () => {
    let s = m();
    s.score[0].games[0] = 3;
    s.score[1].games[0] = 1;
    expect(finishMatch(s).winner).toBe(0);
  });

  it("при равных сетах и геймах — по очкам", () => {
    let s = m();
    s.score[1].points = 2;
    expect(finishMatch(s).winner).toBe(1);
  });

  it("полное равенство — ничья (winner undefined)", () => {
    const r = finishMatch(m());
    expect(r.status).toBe("completed");
    expect(r.winner).toBeUndefined();
  });

  it("завершение можно отменить через undo", () => {
    const s = m();
    const r = finishMatch(s);
    expect(undo(r).status).toBe("in_progress");
  });
});

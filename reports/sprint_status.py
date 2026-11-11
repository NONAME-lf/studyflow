# План спринтів 1–3 (етап 3, backlog.py) vs факт етапу 4 → generated/sprint-plan.tex
# Статус кожного ID — за станом репозиторію (git log) і результатами тестів.
import os
from backlog import BACKLOG, S1, S2, S3

DONE, PARTIAL, MOVED = "Done", "Частково", "Перенесено"

# ID → (статус, примітка). Не вказані ID спринтів 1–3 мають статус Done.
STATUS = {
    "T-03": (DONE, "workflow є; прогін у GitHub — після публікації репозиторію"),
    "D-01": (DONE, "звіти етапів 2–3 здано, етапу 4 — цей звіт"),
    "D-02": (DONE, "демо і рефлексія — на захистах етапів 2–3 і 4"),
}

SPRINTS = [S1, S2, S3]
SPRINT_NO = {S1: 1, S2: 2, S3: 3}


def tex(s):
    for a, b in [("\\", "\\textbackslash{}"), ("&", "\\&"), ("%", "\\%"), ("_", "\\_"), ("#", "\\#")]:
        s = s.replace(a, b)
    return s


def status_cell(status):
    color = {"Done": "teal", PARTIAL: "orange!80!black", MOVED: "red"}[status]
    return f"\\textcolor{{{color}}}{{{status}}}"


items = [r for r in BACKLOG if r[6] in SPRINTS]
rows, notes = [], []
for code, name, _type, _epic, prio, _q, sprint, assignee, sp, _desc in items:
    status, note = STATUS.get(code, (DONE, None))
    mark = ""
    if note:
        notes.append(note)
        mark = f"\\textsuperscript{{{len(notes)}}}"
    rows.append(
        f"{code} & {tex(name)} & {SPRINT_NO[sprint]} & {prio} & {tex(assignee)} & {sp} & "
        f"{status_cell(status)}{mark}\\\\"
    )

out = [
    "\\begin{longtable}{@{}l L{5.0cm} c l l r l@{}}",
    "\\toprule",
    "ID & Назва & Спр. & MoSCoW & Виконавець & SP & Статус\\\\",
    "\\midrule\\endhead",
    *rows,
    "\\bottomrule",
    "\\end{longtable}",
]
if notes:
    out.append("{\\small " + "; ".join(f"\\textsuperscript{{{i}}}\\,{tex(n)}" for i, n in enumerate(notes, 1)) + ".}")

# Підсумок по спринтах
summary = ["\\begin{tabular}{@{}lcccc@{}}", "\\toprule",
           "Спринт & Елементів & План, SP & Done, SP & Частково / перенесено\\\\", "\\midrule"]
total_plan = total_done = total_items = total_open = 0
for s in SPRINTS:
    sprint_items = [r for r in items if r[6] == s]
    plan = sum(r[8] for r in sprint_items)
    done = sum(r[8] for r in sprint_items if STATUS.get(r[0], (DONE, None))[0] == DONE)
    open_ = [r[0] for r in sprint_items if STATUS.get(r[0], (DONE, None))[0] != DONE]
    summary.append(f"{SPRINT_NO[s]} & {len(sprint_items)} & {plan} & {done} & {', '.join(open_) or '—'}\\\\")
    total_plan, total_done, total_items = total_plan + plan, total_done + done, total_items + len(sprint_items)
    total_open += len(open_)
summary += ["\\midrule", f"\\textbf{{Разом}} & \\textbf{{{total_items}}} & \\textbf{{{total_plan}}} & "
            f"\\textbf{{{total_done}}} & {total_open}\\\\", "\\bottomrule", "\\end{tabular}"]

here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, "generated"), exist_ok=True)
with open(os.path.join(here, "generated", "sprint-plan.tex"), "w") as f:
    f.write("\n".join(out) + "\n")
with open(os.path.join(here, "generated", "sprint-summary.tex"), "w") as f:
    f.write("\n".join(summary) + "\n")
print(f"items {total_items}, SP plan {total_plan}, done {total_done}, open {total_open}")
